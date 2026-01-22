'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { IncidenciasService, PreventivosService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Incidencia, Preventivo } from '@/types';

// ============================================
// TIPOS DE ALERTAS
// ============================================

export type TipoAlerta = 'sla' | 'stock' | 'preventivo' | 'critica';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  descripcion: string;
  /** Severidad: alta (rojo), media (naranja), baja (amarillo) */
  severidad: 'alta' | 'media' | 'baja';
  /** Entidad relacionada */
  entidad?: {
    tipo: 'incidencia' | 'equipo' | 'preventivo' | 'inventario';
    id: string;
    codigo?: string;
  };
  /** Fecha de generación */
  fecha: Date;
}

// ============================================
// useAlertas
// ============================================

interface UseAlertasResult {
  alertas: Alerta[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAlertas(): UseAlertasResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setAlertas([]);
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
      const preventivosService = new PreventivosService(db);

      // Obtener incidencias abiertas
      const incidencias = await incidenciasService.filtrar(ctx, {
        estado: ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'],
        pageSize: 200,
      });

      // Obtener preventivos pendientes (próxima ejecución en los próximos 7 días)
      const preventivosPage = await preventivosService.list(ctx, {
        pageSize: 100,
        orderBy: [{ fieldPath: 'proximaEjecucion', direction: 'asc' }],
      });

      const ahora = new Date();
      const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

      const alertasGeneradas: Alerta[] = [];

      // Alertas de incidencias críticas
      incidencias
        .filter((i) => i.criticidad === 'critica')
        .forEach((i) => {
          alertasGeneradas.push({
            id: `critica-${i.id}`,
            tipo: 'critica',
            titulo: `Incidencia crítica: ${i.codigo}`,
            descripcion: i.naturalezaFallo || 'Sin descripción',
            severidad: 'alta',
            entidad: { tipo: 'incidencia', id: i.id, codigo: i.codigo },
            fecha: i.timestamps?.recepcion?.toDate?.() ?? ahora,
          });
        });

      // Alertas de SLA próximo a vencer (incidencias con > 2h sin resolver)
      incidencias.forEach((i) => {
        if (!i.timestamps?.recepcion) return;

        const recepcion = i.timestamps.recepcion.toDate ? i.timestamps.recepcion.toDate() : new Date(i.timestamps.recepcion as any);
        const minutos = (ahora.getTime() - recepcion.getTime()) / 1000 / 60;

        // Si es crítica y lleva > 3h o normal y lleva > 6h
        const umbral = i.criticidad === 'critica' ? 180 : 360;

        if (minutos > umbral && !['resuelta', 'cerrada'].includes(i.estado)) {
          alertasGeneradas.push({
            id: `sla-${i.id}`,
            tipo: 'sla',
            titulo: `SLA en riesgo: ${i.codigo}`,
            descripcion: `Tiempo transcurrido: ${Math.round(minutos / 60)}h`,
            severidad: i.criticidad === 'critica' ? 'alta' : 'media',
            entidad: { tipo: 'incidencia', id: i.id, codigo: i.codigo },
            fecha: recepcion,
          });
        }
      });

      // Alertas de preventivos próximos
      preventivosPage.items.forEach((p) => {
        if (!p.proximaEjecucion || !p.activo) return;

        const proxima = p.proximaEjecucion.toDate ? p.proximaEjecucion.toDate() : new Date(p.proximaEjecucion as any);

        if (proxima <= en7Dias) {
          const diasRestantes = Math.ceil((proxima.getTime() - ahora.getTime()) / 1000 / 60 / 60 / 24);

          alertasGeneradas.push({
            id: `preventivo-${p.id}`,
            tipo: 'preventivo',
            titulo: `Preventivo próximo: ${p.nombre}`,
            descripcion: diasRestantes <= 0 ? 'Vencido' : `En ${diasRestantes} día(s)`,
            severidad: diasRestantes <= 0 ? 'alta' : diasRestantes <= 3 ? 'media' : 'baja',
            entidad: { tipo: 'preventivo', id: p.id, codigo: p.codigo },
            fecha: proxima,
          });
        }
      });

      // Ordenar por severidad y fecha
      alertasGeneradas.sort((a, b) => {
        const severidadOrder = { alta: 0, media: 1, baja: 2 };
        if (severidadOrder[a.severidad] !== severidadOrder[b.severidad]) {
          return severidadOrder[a.severidad] - severidadOrder[b.severidad];
        }
        return b.fecha.getTime() - a.fecha.getTime();
      });

      setAlertas(alertasGeneradas);
    } catch (err) {
      console.error('Error en useAlertas:', err);
      setError('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { alertas, loading, error, refetch: fetch };
}
