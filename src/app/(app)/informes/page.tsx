'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Select } from '@/components/ui';
import {
  generarInformeIncidencias,
  generarInformeSLA,
  generarInformeInventario,
  type DatosInforme,
  type FiltrosInforme,
} from '@/lib/firebase/metricas';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Eye,
  Loader2,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  Wrench,
  Package,
  Clock,
  Bus,
  Users,
  TrendingUp,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de informe disponibles
const TIPOS_INFORME = [
  {
    id: 'incidencias',
    nombre: 'Incidencias',
    descripcion: 'Listado y análisis de incidencias reportadas',
    icono: AlertTriangle,
    color: 'red',
  },
  {
    id: 'sla',
    nombre: 'Cumplimiento SLA',
    descripcion: 'Análisis de tiempos de respuesta y resolución',
    icono: Clock,
    color: 'blue',
  },
  {
    id: 'disponibilidad',
    nombre: 'Disponibilidad Flota',
    descripcion: 'Estado y disponibilidad de vehículos',
    icono: Bus,
    color: 'green',
  },
  {
    id: 'inventario',
    nombre: 'Inventario',
    descripcion: 'Stock actual, movimientos y valoración',
    icono: Package,
    color: 'purple',
  },
  {
    id: 'preventivos',
    nombre: 'Mantenimientos Preventivos',
    descripcion: 'Ejecución y cumplimiento de preventivos',
    icono: Calendar,
    color: 'amber',
  },
  {
    id: 'tecnicos',
    nombre: 'Intervenciones Técnicos',
    descripcion: 'Productividad y trabajos por técnico',
    icono: Users,
    color: 'cyan',
  },
  {
    id: 'costes',
    nombre: 'Análisis de Costes',
    descripcion: 'Desglose de costes de mantenimiento',
    icono: TrendingUp,
    color: 'emerald',
  },
] as const;

type TipoInforme = typeof TIPOS_INFORME[number]['id'];

export default function InformesPage() {
  const { claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoInforme>('incidencias');
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [datosInforme, setDatosInforme] = useState<DatosInforme | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [fechaHasta, setFechaHasta] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');

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
      case '30dias':
        setFechaDesde(format(subDays(hoy, 30), 'yyyy-MM-dd'));
        setFechaHasta(format(hoy, 'yyyy-MM-dd'));
        break;
      case 'mes_actual':
        setFechaDesde(format(startOfMonth(hoy), 'yyyy-MM-dd'));
        setFechaHasta(format(endOfMonth(hoy), 'yyyy-MM-dd'));
        break;
      case 'mes_anterior':
        const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        setFechaDesde(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
        setFechaHasta(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
        break;
    }
  };

  // Generar informe
  const generarInforme = async () => {
    if (!tenantId) return;

    setGenerando(true);
    try {
      const filtros: FiltrosInforme = {
        fechaDesde: new Date(fechaDesde),
        fechaHasta: new Date(fechaHasta),
      };

      let datos: DatosInforme;

      switch (tipoSeleccionado) {
        case 'incidencias':
          datos = await generarInformeIncidencias(tenantId, filtros);
          break;
        case 'sla':
          datos = await generarInformeSLA(tenantId, filtros);
          break;
        case 'inventario':
          datos = await generarInformeInventario(tenantId);
          break;
        default:
          // Mock para otros tipos
          datos = {
            titulo: `Informe de ${TIPOS_INFORME.find((t) => t.id === tipoSeleccionado)?.nombre}`,
            fechaGeneracion: new Date(),
            periodo: { desde: new Date(fechaDesde), hasta: new Date(fechaHasta) },
            datos: [],
            resumen: { total: 0 },
          };
      }

      setDatosInforme(datos);
      setVistaPrevia(true);
    } catch (error) {
      console.error('Error generando informe:', error);
    } finally {
      setGenerando(false);
    }
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!datosInforme) return;

    const headers = Object.keys(datosInforme.datos[0] || {});
    const csvContent = [
      headers.join(','),
      ...datosInforme.datos.map((row) =>
        headers.map((h) => {
          const val = (row as Record<string, unknown>)[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      ),
    ].join('\n');

    descargarArchivo(csvContent, `${datosInforme.titulo}.csv`, 'text/csv');
  };

  // Exportar a JSON
  const exportarJSON = () => {
    if (!datosInforme) return;

    const jsonContent = JSON.stringify(datosInforme, null, 2);
    descargarArchivo(
      jsonContent,
      `${datosInforme.titulo}.json`,
      'application/json'
    );
  };

  // Exportar a Excel (simulado como CSV con formato)
  const exportarExcel = () => {
    if (!datosInforme) return;

    const headers = Object.keys(datosInforme.datos[0] || {});
    const csvContent = [
      headers.join('\t'),
      ...datosInforme.datos.map((row) =>
        headers.map((h) => (row as Record<string, unknown>)[h]).join('\t')
      ),
    ].join('\n');

    descargarArchivo(
      csvContent,
      `${datosInforme.titulo}.xls`,
      'application/vnd.ms-excel'
    );
  };

  // Helper para descargar archivos
  const descargarArchivo = (
    contenido: string,
    nombre: string,
    tipo: string
  ) => {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generar PDF (placeholder)
  const exportarPDF = () => {
    alert('Exportación PDF disponible próximamente');
  };

  const tipoActual = TIPOS_INFORME.find((t) => t.id === tipoSeleccionado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Generador de Informes
          </h1>
          <p className="text-slate-500 mt-1">
            Crea informes personalizados con filtros y exportación
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel izquierdo: Tipos de informe */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
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
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                    }`}
                    onClick={() => {
                      setTipoSeleccionado(tipo.id);
                      setVistaPrevia(false);
                      setDatosInforme(null);
                    }}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-100' : 'bg-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isSelected ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isSelected ? 'text-blue-800' : 'text-slate-700'
                        }`}
                      >
                        {tipo.nombre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tipo.descripcion}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Panel central/derecho: Configuración y vista previa */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  Filtros del Informe: {tipoActual?.nombre}
                </CardTitle>
                <div className="flex gap-1">
                  {['hoy', '7dias', '30dias', 'mes_actual', 'mes_anterior'].map(
                    (preset) => (
                      <Button
                        key={preset}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => aplicarPreset(preset)}
                      >
                        {preset === 'hoy'
                          ? 'Hoy'
                          : preset === '7dias'
                          ? '7 días'
                          : preset === '30dias'
                          ? '30 días'
                          : preset === 'mes_actual'
                          ? 'Este mes'
                          : 'Mes anterior'}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fecha desde */}
                <div className="space-y-2">
                  <label htmlFor="fechaDesde" className="text-sm font-medium text-slate-300">
                    Fecha desde
                  </label>
                  <Input
                    id="fechaDesde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>

                {/* Fecha hasta */}
                <div className="space-y-2">
                  <label htmlFor="fechaHasta" className="text-sm font-medium text-slate-300">
                    Fecha hasta
                  </label>
                  <Input
                    id="fechaHasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>

                {/* Filtro específico según tipo */}
                {tipoSeleccionado === 'incidencias' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Estado</label>
                      <Select
                        value={filtroEstado}
                        onChange={setFiltroEstado}
                        options={[
                          { value: 'todos', label: 'Todos' },
                          { value: 'nueva', label: 'Nueva' },
                          { value: 'en_analisis', label: 'En análisis' },
                          { value: 'en_intervencion', label: 'En intervención' },
                          { value: 'resuelta', label: 'Resuelta' },
                          { value: 'cerrada', label: 'Cerrada' },
                        ]}
                        placeholder="Todos"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Criticidad</label>
                      <Select
                        value={filtroPrioridad}
                        onChange={setFiltroPrioridad}
                        options={[
                          { value: 'todos', label: 'Todas' },
                          { value: 'critica', label: 'Crítica' },
                          { value: 'normal', label: 'Normal' },
                        ]}
                        placeholder="Todas"
                      />
                    </div>
                  </>
                )}

                {tipoSeleccionado === 'sla' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Tipo OT</label>
                    <Select
                      value={filtroEstado}
                      onChange={setFiltroEstado}
                      options={[
                        { value: 'todos', label: 'Todos' },
                        { value: 'correctivo', label: 'Correctivo' },
                        { value: 'preventivo', label: 'Preventivo' },
                      ]}
                      placeholder="Todos"
                    />
                  </div>
                )}
              </div>

              {/* Botón generar */}
              <div className="flex justify-end mt-4">
                <Button onClick={generarInforme} disabled={generando}>
                  {generando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Generar Vista Previa
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vista previa del informe */}
          {vistaPrevia && datosInforme && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      {datosInforme.titulo}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Período: {format(datosInforme.periodo.desde, "dd/MM/yyyy", { locale: es })} -{' '}
                      {format(datosInforme.periodo.hasta, "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportarCSV}>
                      <FileText className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportarExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportarJSON}>
                      <FileJson className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button size="sm" onClick={exportarPDF}>
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Resumen */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(datosInforme.resumen).map(([key, value]) => (
                    <div
                      key={key}
                      className="text-center p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-slate-900">
                        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabla de datos */}
                {datosInforme.datos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {Object.keys(datosInforme.datos[0])
                            .filter((k) => !k.startsWith('auditoria'))
                            .slice(0, 6)
                            .map((header) => (
                              <th
                                key={header}
                                className="text-left py-2 px-3 font-medium text-slate-600 capitalize"
                              >
                                {header.replace(/_/g, ' ')}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {datosInforme.datos.slice(0, 10).map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            {Object.entries(row)
                              .filter(([k]) => !k.startsWith('auditoria'))
                              .slice(0, 6)
                              .map(([key, value], i) => (
                                <td key={i} className="py-2 px-3 text-slate-700">
                                  {typeof value === 'object'
                                    ? JSON.stringify(value).slice(0, 30) + '...'
                                    : String(value).slice(0, 30)}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {datosInforme.datos.length > 10 && (
                      <p className="text-sm text-slate-500 text-center mt-3">
                        Mostrando 10 de {datosInforme.datos.length} registros.
                        Exporta para ver todos.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No se encontraron datos para los filtros seleccionados
                  </div>
                )}

                {/* Metadatos del informe */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Generado: {format(datosInforme.fechaGeneracion, "dd/MM/yyyy HH:mm:ss", { locale: es })}
                    </span>
                    <span>
                      Total registros: {datosInforme.datos.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Placeholder cuando no hay informe */}
          {!vistaPrevia && (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">
                    Configura los filtros y genera el informe
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Selecciona el tipo de informe, ajusta los filtros según tus
                    necesidades y haz clic en &quot;Generar Vista Previa&quot; para ver los
                    datos antes de exportar.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}