'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirestore } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Select } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/contexts/OperadorContext';
import { useReportData, useOperadoresList } from '@/hooks/useReportData';
import { RequirePermission } from '@/lib/permissions';
import { getAuditService } from '@/lib/firebase/services/audit.service';

// Lógica de transformación
import {
  incidenciasAFilasExcel,
  generarResumenEjecutivoSLA,
  generarResumenFlota,
  formatMinutosAHoras,
} from '@/lib/logic/reports';

// Exportadores
import { exportarIncidenciasExcel, exportarResumenEjecutivoExcel } from '@/lib/reports/excel';
import { exportarResumenEjecutivoPDF, exportarIncidenciasPDF, exportarResumenFlotaPDF } from '@/lib/reports/pdf';
import type { FiltrosInforme } from '@/lib/reports/types';

import {
  FileText,
  Download,
  Calendar,
  Filter,
  Eye,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Bus,
  TrendingUp,
  Building2,
  FileDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// =============================================================================
// TIPOS DE INFORME
// =============================================================================

const TIPOS_INFORME = [
  {
    id: 'resumen_sla',
    nombre: 'Resumen Ejecutivo SLA',
    descripcion: 'KPIs principales: Disponibilidad, MTTR, Cumplimiento SLA',
    icono: TrendingUp,
    color: 'blue',
    formatos: ['pdf', 'excel'],
  },
  {
    id: 'historico_incidencias',
    nombre: 'Histórico de Incidencias',
    descripcion: 'Listado completo con tiempos de respuesta y resolución',
    icono: AlertTriangle,
    color: 'red',
    formatos: ['excel', 'pdf'],
  },
  {
    id: 'estado_flota',
    nombre: 'Estado de la Flota',
    descripcion: 'Disponibilidad y autobuses con más incidencias',
    icono: Bus,
    color: 'green',
    formatos: ['pdf', 'excel'],
  },
] as const;

type TipoInforme = typeof TIPOS_INFORME[number]['id'];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function InformesPage() {
  const { claims, canAccessAllTenants, usuario } = useAuth();
  const tenantId = useTenantId();
  
  // Hook de datos
  const { incidencias, autobuses, loading, error, cargarDatos, limpiar } = useReportData();
  const { operadores } = useOperadoresList();

  // Estados del formulario
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoInforme>('resumen_sla');
  const [fechaDesde, setFechaDesde] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<string>('');
  const [exportando, setExportando] = useState(false);
  const [datosListos, setDatosListos] = useState(false);

  // Resetear estado cuando cambia el tipo de informe
  useEffect(() => {
    setDatosListos(false);
    limpiar();
  }, [tipoSeleccionado, limpiar]);

  // Presets de fechas
  const aplicarPreset = (preset: string) => {
    const hoy = new Date();
    switch (preset) {
      case 'hoy':
        setFechaDesde(format(hoy, 'yyyy-MM-dd'));
        setFechaHasta(format(hoy, 'yyyy-MM-dd'));
        break;
      case '7dias':
        setFechaDesde(format(subDays(hoy, 7), 'yyyy-MM-dd'));
        setFechaHasta(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'mes_actual':
        setFechaDesde(format(startOfMonth(hoy), 'yyyy-MM-dd'));
        setFechaHasta(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'mes_anterior':
        const mesAnterior = subMonths(hoy, 1);
        setFechaDesde(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
        setFechaHasta(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
        break;
    }
  };

  // Cargar datos para el informe
  const handleCargarDatos = async () => {
    const filtros = {
      fechaDesde: new Date(fechaDesde),
      fechaHasta: new Date(fechaHasta + 'T23:59:59'),
      operadorId: operadorSeleccionado || undefined,
    };

    await cargarDatos(filtros);
    setDatosListos(true);
  };

  // Generar filtros para transformación
  const getFiltros = (): FiltrosInforme => ({
    fechaDesde: new Date(fechaDesde),
    fechaHasta: new Date(fechaHasta + 'T23:59:59'),
    operadorId: operadorSeleccionado || undefined,
  });

  // Log de exportación (silencioso)
  const logExportacion = useCallback(async (tipo: string, formato: 'excel' | 'pdf') => {
    if (!usuario) return;
    
    try {
      const db = getFirestore();
      const auditService = getAuditService(db);
      await auditService.logAction(
        {
          tenantId: tenantId || 'global',
          actor: {
            uid: usuario.id,
            email: usuario.email,
            rol: claims?.rol || 'usuario',
            tenantId: claims?.tenantId, // Tenant de origen del actor
          },
        },
        {
          entidad: 'incidencia', // Usamos incidencia como entidad general para informes
          entidadId: `informe-${tipo}-${Date.now()}`,
          accion: 'crear',
          cambios: [
            { campo: 'tipoInforme', valorAnterior: null, valorNuevo: tipo },
            { campo: 'formato', valorAnterior: null, valorNuevo: formato },
            { campo: 'fechaDesde', valorAnterior: null, valorNuevo: fechaDesde },
            { campo: 'fechaHasta', valorAnterior: null, valorNuevo: fechaHasta },
            { campo: 'registros', valorAnterior: null, valorNuevo: incidencias.length },
          ],
          motivoCambio: `Exportación de informe ${tipo} en formato ${formato.toUpperCase()}`,
        }
      );
    } catch (err) {
      // Silencioso: no interrumpir la exportación
      console.warn('[Informes] Error registrando exportación:', err);
    }
  }, [usuario, tenantId, claims?.rol, fechaDesde, fechaHasta, incidencias.length]);

  // Obtener nombre de operador
  const getNombreOperador = () => {
    if (!operadorSeleccionado) return undefined;
    const op = operadores.find(o => o.id === operadorSeleccionado);
    return op?.nombre;
  };

  // === EXPORTADORES ===

  const handleExportarExcel = async () => {
    if (!datosListos) return;
    setExportando(true);
    
    try {
      const filtros = getFiltros();
      const nombreOperador = getNombreOperador();
      const usuarioNombre = usuario?.nombre ? `${usuario.nombre} ${usuario.apellidos || ''}`.trim() : (usuario?.email || 'Sistema');

      switch (tipoSeleccionado) {
        case 'resumen_sla': {
          const resumen = generarResumenEjecutivoSLA(incidencias, autobuses, filtros, nombreOperador, usuarioNombre);
          exportarResumenEjecutivoExcel(resumen, {
            nombreArchivo: `resumen-sla-${format(new Date(), 'yyyy-MM')}`,
            nombreHoja: 'Resumen SLA',
          });
          break;
        }
        case 'historico_incidencias': {
          const filas = incidenciasAFilasExcel(incidencias, nombreOperador);
          exportarIncidenciasExcel(filas, {
            nombreArchivo: 'historico-incidencias',
            nombreHoja: 'Incidencias',
            incluirResumen: true,
          });
          break;
        }
        case 'estado_flota': {
          // Para flota también usamos el resumen ejecutivo con foco en flota
          const resumen = generarResumenFlota(autobuses, incidencias, filtros, nombreOperador, usuarioNombre);
          // Usar export genérico ya que no hay específico de flota para Excel
          exportarResumenEjecutivoExcel(
            generarResumenEjecutivoSLA(incidencias, autobuses, filtros, nombreOperador, usuarioNombre),
            {
              nombreArchivo: `estado-flota-${format(new Date(), 'yyyy-MM')}`,
              nombreHoja: 'Estado Flota',
            }
          );
          break;
        }
      }
      
      // Registrar exportación (silencioso)
      logExportacion(tipoSeleccionado, 'excel');
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Error al exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!datosListos) return;
    setExportando(true);
    
    try {
      const filtros = getFiltros();
      const nombreOperador = getNombreOperador();
      const usuarioNombre = usuario?.nombre ? `${usuario.nombre} ${usuario.apellidos || ''}`.trim() : (usuario?.email || 'Sistema');

      switch (tipoSeleccionado) {
        case 'resumen_sla': {
          const resumen = generarResumenEjecutivoSLA(incidencias, autobuses, filtros, nombreOperador, usuarioNombre);
          await exportarResumenEjecutivoPDF(resumen, {
            nombreArchivo: `resumen-ejecutivo-sla-${format(new Date(), 'yyyy-MM')}`,
            titulo: 'Resumen Ejecutivo de SLA',
            incluirLogo: true,
          });
          break;
        }
        case 'historico_incidencias': {
          const filas = incidenciasAFilasExcel(incidencias, nombreOperador);
          const desde = format(new Date(fechaDesde), 'dd/MM/yyyy');
          const hasta = format(new Date(fechaHasta), 'dd/MM/yyyy');
          await exportarIncidenciasPDF(filas, {
            nombreArchivo: 'listado-incidencias',
            titulo: 'Histórico de Incidencias',
            subtitulo: `Período: ${desde} - ${hasta}`,
            incluirLogo: true,
            orientacion: 'landscape',
          });
          break;
        }
        case 'estado_flota': {
          const resumen = generarResumenFlota(autobuses, incidencias, filtros, nombreOperador, usuarioNombre);
          await exportarResumenFlotaPDF(resumen, {
            nombreArchivo: `estado-flota-${format(new Date(), 'yyyy-MM')}`,
            titulo: 'Estado de la Flota',
            incluirLogo: true,
          });
          break;
        }
      }
      
      // Registrar exportación (silencioso)
      logExportacion(tipoSeleccionado, 'pdf');
    } catch (err) {
      console.error('Error exportando PDF:', err);
      alert('Error al exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  // Generar reporte mensual rápido
  const handleReporteMensual = async () => {
    const hoy = new Date();
    const mesAnterior = subMonths(hoy, 1);
    
    setFechaDesde(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
    setFechaHasta(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
    setTipoSeleccionado('resumen_sla');
    
    // Cargar datos y exportar
    const filtros = {
      fechaDesde: startOfMonth(mesAnterior),
      fechaHasta: endOfMonth(mesAnterior),
      operadorId: operadorSeleccionado || undefined,
    };
    
    setExportando(true);
    try {
      await cargarDatos(filtros);
      setDatosListos(true);
      
      // Esperar un poco para que los datos se actualicen
      setTimeout(async () => {
        const nombreOperador = getNombreOperador();
        const usuarioNombre = usuario?.nombre ? `${usuario.nombre} ${usuario.apellidos || ''}`.trim() : (usuario?.email || 'Sistema');
        const resumen = generarResumenEjecutivoSLA(incidencias, autobuses, filtros, nombreOperador, usuarioNombre);
        await exportarResumenEjecutivoPDF(resumen, {
          nombreArchivo: `reporte-mensual-${format(mesAnterior, 'yyyy-MM')}`,
          titulo: `Reporte Mensual - ${format(mesAnterior, 'MMMM yyyy', { locale: es })}`,
          incluirLogo: true,
        });
        setExportando(false);
      }, 1000);
    } catch (err) {
      setExportando(false);
      console.error('Error generando reporte mensual:', err);
    }
  };

  const tipoActual = TIPOS_INFORME.find(t => t.id === tipoSeleccionado);

  return (
    <RequirePermission permission="sla:ver" fallback={
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Acceso Restringido</h2>
        <p className="text-slate-600">No tienes permisos para acceder al módulo de informes.</p>
      </div>
    }>
      <div className="space-y-6 p-4 sm:p-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Centro de Informes</h1>
            <p className="text-slate-400 mt-1">
              Genera y exporta informes de SLA, incidencias y estado de flota
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleReporteMensual}
              disabled={exportando || loading}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Reporte Mensual
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel izquierdo: Tipos de informe */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  Tipo de Informe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TIPOS_INFORME.map((tipo) => {
                  const Icon = tipo.icono;
                  const isSelected = tipoSeleccionado === tipo.id;

                  return (
                    <button
                      key={tipo.id}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                      }`}
                      onClick={() => setTipoSeleccionado(tipo.id)}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                          {tipo.nombre}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{tipo.descripcion}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Formatos disponibles */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  Formatos Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                {tipoActual?.formatos.includes('pdf') && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30">
                    <FileText className="w-3 h-3 mr-1" /> PDF
                  </Badge>
                )}
                {tipoActual?.formatos.includes('excel') && (
                  <Badge variant="outline" className="text-green-400 border-green-400/30">
                    <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel central/derecho: Filtros y acciones */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filtros */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  Filtros del Informe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets de fecha */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => aplicarPreset('hoy')}>
                    Hoy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => aplicarPreset('7dias')}>
                    Últimos 7 días
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => aplicarPreset('mes_actual')}>
                    Mes actual
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => aplicarPreset('mes_anterior')}>
                    Mes anterior
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Fecha desde */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Desde</label>
                    <Input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  {/* Fecha hasta */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Hasta</label>
                    <Input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  {/* Selector de operador (solo para DFG) */}
                  {canAccessAllTenants && operadores.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Operador
                      </label>
                      <select
                        value={operadorSeleccionado}
                        onChange={(e) => setOperadorSeleccionado(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                      >
                        <option value="">Todos los operadores</option>
                        {operadores.map(op => (
                          <option key={op.id} value={op.id}>{op.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Botón cargar datos */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleCargarDatos} 
                    disabled={loading}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Cargar Datos
                  </Button>

                  {datosListos && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {incidencias.length} incidencias, {autobuses.length} autobuses
                    </Badge>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vista previa de KPIs */}
            {datosListos && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-slate-200">
                    Vista Previa - {tipoActual?.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResumenPrevia 
                    incidencias={incidencias} 
                    autobuses={autobuses}
                    filtros={getFiltros()}
                  />
                </CardContent>
              </Card>
            )}

            {/* Acciones de exportación */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-400" />
                  Exportar Informe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {tipoActual?.formatos.includes('excel') && (
                    <Button
                      onClick={handleExportarExcel}
                      disabled={!datosListos || exportando}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {exportando ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      Exportar Excel
                    </Button>
                  )}
                  
                  {tipoActual?.formatos.includes('pdf') && (
                    <Button
                      onClick={handleExportarPDF}
                      disabled={!datosListos || exportando}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {exportando ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4 mr-2" />
                      )}
                      Exportar PDF
                    </Button>
                  )}
                </div>

                {!datosListos && (
                  <p className="text-sm text-slate-500 mt-3">
                    Primero carga los datos usando el botón "Cargar Datos"
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}

// =============================================================================
// COMPONENTE DE VISTA PREVIA
// =============================================================================

import type { Incidencia, Autobus } from '@/types';
import { calcularMTTR } from '@/lib/logic/reports';
import { verificarEstadoSLA } from '@/lib/logic/sla';

interface ResumenPreviaProps {
  incidencias: Incidencia[];
  autobuses: Autobus[];
  filtros: FiltrosInforme;
}

function ResumenPrevia({ incidencias, autobuses, filtros }: ResumenPreviaProps) {
  // Calcular KPIs
  const flotaTotal = autobuses.length;
  const flotaOperativa = autobuses.filter(a => a.estado === 'operativo').length;
  const disponibilidad = flotaTotal > 0 ? Math.round((flotaOperativa / flotaTotal) * 100) : 0;

  const incidenciasResueltas = incidencias.filter(i => i.estado === 'resuelta' || i.estado === 'cerrada');
  const incidenciasCriticas = incidencias.filter(i => i.criticidad === 'critica');

  // Calcular cumplimiento SLA
  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts.toDate === 'function') return ts.toDate();
    return null;
  };

  let dentroDeSLA = 0;
  incidencias.forEach(inc => {
    const recepcion = toDate(inc.timestamps?.recepcion);
    const fechaResolucion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
    if (recepcion && inc.criticidad) {
      const resultado = verificarEstadoSLA(recepcion, fechaResolucion, inc.criticidad);
      if (resultado.dentroSLA) dentroDeSLA++;
    }
  });

  const cumplimientoSLA = incidencias.length > 0 
    ? Math.round((dentroDeSLA / incidencias.length) * 100) 
    : 100;

  // MTTR
  const mttr = calcularMTTR(incidenciasResueltas);
  const mttrTexto = mttr !== null ? formatMinutosAHoras(mttr) : '-';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-green-400">{disponibilidad}%</p>
        <p className="text-xs text-slate-400">Disponibilidad Flota</p>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-cyan-400">{cumplimientoSLA}%</p>
        <p className="text-xs text-slate-400">Cumplimiento SLA</p>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-amber-400">{mttrTexto}</p>
        <p className="text-xs text-slate-400">MTTR (laborable)</p>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
        <p className="text-2xl font-bold text-red-400">{incidenciasCriticas.length}</p>
        <p className="text-xs text-slate-400">Inc. Críticas</p>
      </div>
    </div>
  );
}
