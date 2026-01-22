'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import {
  IncidenciasService,
  EquiposService,
  AutobusesService,
  type ServiceContext,
} from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { EstadoIncidencia, Criticidad } from '@/types';

// ============================================
// useEstadisticas (KPIs del dashboard)
// ============================================

export interface Estadisticas {
  incidencias: {
    total: number;
    abiertas: number;
    criticas: number;
    resueltasHoy: number;
    porEstado: Record<EstadoIncidencia, number>;
  };
  equipos: {
    total: number;
    enServicio: number;
    enAlmacen: number;
    enLaboratorio: number;
    averiados: number;
  };
  autobuses: {
    total: number;
    operativos: number;
    enTaller: number;
  };
  tiemposPromedio: {
    atencionMinutos: number;
    resolucionMinutos: number;
  };
}

interface UseEstadisticasResult {
  estadisticas: Estadisticas | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEstadisticas(): UseEstadisticasResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setEstadisticas(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ctx: ServiceContext = {
        tenantId,
        actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
      };

      const incidenciasService = new IncidenciasService(db);
      const equiposService = new EquiposService(db);
      const autobusesService = new AutobusesService(db);

      // Cargar datos en paralelo
      const [incidencias, equiposPage, autobusesPage] = await Promise.all([
        incidenciasService.filtrar(ctx, { pageSize: 1000 }),
        equiposService.list(ctx, { pageSize: 1000 }),
        autobusesService.list(ctx, { pageSize: 1000 }),
      ]);

      const equipos = equiposPage.items;
      const autobuses = autobusesPage.items;

      // Calcular estadísticas de incidencias
      const estadosAbiertos: EstadoIncidencia[] = ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'];
      const abiertas = incidencias.filter((i) => estadosAbiertos.includes(i.estado));
      const criticas = incidencias.filter((i) => i.criticidad === 'critica' && estadosAbiertos.includes(i.estado));

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const resueltasHoy = incidencias.filter((i) => {
        if (i.estado !== 'resuelta' && i.estado !== 'cerrada') return false;
        const ts = i.timestamps?.finReparacion;
        if (!ts) return false;
        const fecha = ts.toDate ? ts.toDate() : new Date(ts as any);
        return fecha >= hoy;
      });

      const porEstado: Record<EstadoIncidencia, number> = {
        nueva: 0,
        en_analisis: 0,
        en_intervencion: 0,
        resuelta: 0,
        cerrada: 0,
        reabierta: 0,
      };
      incidencias.forEach((i) => {
        if (porEstado[i.estado] !== undefined) {
          porEstado[i.estado]++;
        }
      });

      // Calcular tiempos promedio
      let totalAtencion = 0;
      let countAtencion = 0;
      let totalResolucion = 0;
      let countResolucion = 0;

      incidencias.forEach((i) => {
        if (i.sla?.tiempoAtencion) {
          totalAtencion += i.sla.tiempoAtencion;
          countAtencion++;
        }
        if (i.sla?.tiempoResolucion) {
          totalResolucion += i.sla.tiempoResolucion;
          countResolucion++;
        }
      });

      // Estadísticas de equipos
      const equiposStats = {
        total: equipos.length,
        enServicio: equipos.filter((e) => e.estado === 'en_servicio').length,
        enAlmacen: equipos.filter((e) => e.estado === 'en_almacen').length,
        enLaboratorio: equipos.filter((e) => e.estado === 'en_laboratorio').length,
        averiados: equipos.filter((e) => e.estado === 'averiado').length,
      };

      // Estadísticas de autobuses
      const autobusesStats = {
        total: autobuses.length,
        operativos: autobuses.filter((a) => a.estado === 'operativo').length,
        enTaller: autobuses.filter((a) => a.estado === 'en_taller').length,
      };

      setEstadisticas({
        incidencias: {
          total: incidencias.length,
          abiertas: abiertas.length,
          criticas: criticas.length,
          resueltasHoy: resueltasHoy.length,
          porEstado,
        },
        equipos: equiposStats,
        autobuses: autobusesStats,
        tiemposPromedio: {
          atencionMinutos: countAtencion > 0 ? Math.round(totalAtencion / countAtencion) : 0,
          resolucionMinutos: countResolucion > 0 ? Math.round(totalResolucion / countResolucion) : 0,
        },
      });
    } catch (err) {
      console.error('Error en useEstadisticas:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { estadisticas, loading, error, refetch: fetch };
}
