/**
 * =============================================================================
 * COMPONENTE: HistorialCambios
 * =============================================================================
 * 
 * Componente para mostrar el historial de auditoría de una entidad.
 * Muestra quién, cuándo y qué cambió de forma visual y clara.
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import {
  useAuditHistory,
  formatearValorAuditoria,
  traducirCampo,
  traducirAccion,
} from '@/hooks/useAuditHistory';
import type { AuditLog, CambioAuditoria } from '@/types';
import {
  History,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// =============================================================================
// TIPOS
// =============================================================================

interface HistorialCambiosProps {
  /** ID de la entidad para mostrar historial */
  entidadId: string;
  /** Título de la sección (opcional) */
  titulo?: string;
  /** Número máximo de registros a mostrar */
  limite?: number;
  /** Si true, usa listener en tiempo real */
  realtime?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getIconoAccion(accion: AuditLog['accion']) {
  switch (accion) {
    case 'crear':
      return <Plus className="w-4 h-4 text-green-500" />;
    case 'actualizar':
    case 'cambio_estado':
      return <Edit className="w-4 h-4 text-blue-500" />;
    case 'eliminar':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    default:
      return <History className="w-4 h-4 text-slate-400" />;
  }
}

function getColorAccion(accion: AuditLog['accion']): string {
  switch (accion) {
    case 'crear':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'actualizar':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cambio_estado':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'eliminar':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
}

function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '-';
  
  try {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '-';
    }
    
    return format(date, "d MMM yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return '-';
  }
}

// =============================================================================
// COMPONENTE DE CAMBIO INDIVIDUAL
// =============================================================================

function CambioItem({ cambio }: { cambio: CambioAuditoria }) {
  const campoTraducido = traducirCampo(cambio.campo);
  const valorAnterior = formatearValorAuditoria(cambio.valorAnterior);
  const valorNuevo = formatearValorAuditoria(cambio.valorNuevo);

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">
        {campoTraducido}:
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-500 dark:text-slate-400 line-through text-xs">
          {valorAnterior}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-800 dark:text-slate-200 font-medium">
          {valorNuevo}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE DE LOG INDIVIDUAL
// =============================================================================

function LogItem({ log }: { log: AuditLog }) {
  const [expandido, setExpandido] = useState(false);
  const tieneCambios = log.cambios && log.cambios.length > 0;

  return (
    <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-3 relative">
      {/* Punto en la línea de tiempo */}
      <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
        {getIconoAccion(log.accion)}
      </div>

      {/* Header del log */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getColorAccion(log.accion)}>
            {traducirAccion(log.accion)}
          </Badge>
          {log.motivoCambio && (
            <span className="text-xs text-slate-500 italic">
              "{log.motivoCambio}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {log.usuarioEmail}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(log.timestamp)}
          </span>
        </div>
      </div>

      {/* Rol del usuario */}
      <div className="text-xs text-slate-400 mb-2">
        Rol: {log.usuarioRol}
      </div>

      {/* Cambios (expandible) */}
      {tieneCambios && (
        <div>
          <button
            onClick={() => setExpandido(!expandido)}
            className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
          >
            {expandido ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ocultar detalles
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ver {log.cambios.length} cambio{log.cambios.length > 1 ? 's' : ''}
              </>
            )}
          </button>

          {expandido && (
            <div className="mt-2 pl-2 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-r p-2">
              {log.cambios.map((cambio, idx) => (
                <CambioItem key={idx} cambio={cambio} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function HistorialCambios({
  entidadId,
  titulo = 'Historial de Cambios',
  limite = 50,
  realtime = false,
  className = '',
}: HistorialCambiosProps) {
  const { logs, loading, error, refetch } = useAuditHistory(entidadId, {
    limit: limite,
    realtime,
  });

  return (
    <Card className={`bg-white dark:bg-slate-800 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            {titulo}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estado de carga */}
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando historial...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 py-4">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Sin datos */}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay cambios registrados</p>
          </div>
        )}

        {/* Lista de logs */}
        {logs.length > 0 && (
          <div className="space-y-1">
            {logs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HistorialCambios;
