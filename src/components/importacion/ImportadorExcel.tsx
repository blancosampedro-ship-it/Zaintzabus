'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  LoadingSpinner,
  EmptyState,
} from '@/components/ui';
import {
  leerExcel,
  detectarMapeoAutomatico,
  procesarFilas,
  obtenerEstadisticas,
  generarPlantillaExcel,
} from '@/lib/importacion';
import type {
  FilaImportacion,
  MapeoColumna,
  ConfiguracionImportacion,
  LogImportacion,
  ResultadoImportacion,
} from '@/types';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  Columns,
  FileCheck,
  Loader2,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface ImportadorExcelProps<T = Record<string, unknown>> {
  /** Tipo de entidad a importar */
  tipoEntidad: ConfiguracionImportacion['tipoEntidad'];
  /** Título del importador */
  titulo: string;
  /** Descripción */
  descripcion: string;
  /** Campos disponibles para mapeo */
  camposDisponibles: {
    nombre: string;
    etiqueta: string;
    requerido: boolean;
    tipo: MapeoColumna['tipoDato'];
  }[];
  /** Función para importar los datos */
  onImportar: (filas: FilaImportacion<T>[]) => Promise<ResultadoImportacion>;
  /** Callback cuando termina la importación */
  onComplete?: (resultado: ResultadoImportacion) => void;
  /** Prefijo para códigos automáticos */
  prefijoCodigoAutomatico?: string;
  /** Si generar códigos automáticos */
  generarCodigosAutomaticos?: boolean;
  /** Campo para detectar duplicados */
  campoDuplicado?: string;
}

type PasoImportacion = 'subir' | 'mapeo' | 'preview' | 'importando' | 'resultado';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ImportadorExcel<T = Record<string, unknown>>({
  tipoEntidad,
  titulo,
  descripcion,
  camposDisponibles,
  onImportar,
  onComplete,
  prefijoCodigoAutomatico = 'IMP',
  generarCodigosAutomaticos = true,
  campoDuplicado,
}: ImportadorExcelProps<T>) {
  // Estados
  const [paso, setPaso] = useState<PasoImportacion>('subir');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojas, setHojas] = useState<string[]>([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>('');
  const [encabezados, setEncabezados] = useState<Record<string, string[]>>({});
  const [datosOriginales, setDatosOriginales] = useState<Record<string, unknown>[][]>([]);
  const [mapeoColumnas, setMapeoColumnas] = useState<MapeoColumna[]>([]);
  const [filasProcesadas, setFilasProcesadas] = useState<FilaImportacion<T>[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginación de preview
  const [paginaActual, setPaginaActual] = useState(0);
  const filasPorPagina = 20;
  
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // PASO 1: SUBIR ARCHIVO
  // ============================================

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const { hojas, datos, encabezados } = await leerExcel(file);
      
      setArchivo(file);
      setHojas(hojas);
      setEncabezados(encabezados);
      setDatosOriginales(datos);
      
      // Seleccionar primera hoja por defecto
      if (hojas.length > 0) {
        setHojaSeleccionada(hojas[0]);
        
        // Detectar mapeo automático
        const mapeoAuto = detectarMapeoAutomatico(encabezados[hojas[0]], tipoEntidad);
        setMapeoColumnas(mapeoAuto);
      }

      setPaso('mapeo');
    } catch (err) {
      setError(`Error leyendo el archivo: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [tipoEntidad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (inputRef.current) {
        inputRef.current.files = dataTransfer.files;
        inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, []);

  const descargarPlantilla = () => {
    const blob = generarPlantillaExcel(tipoEntidad);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${tipoEntidad}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // PASO 2: MAPEO DE COLUMNAS
  // ============================================

  const handleHojaChange = (hoja: string) => {
    setHojaSeleccionada(hoja);
    const mapeoAuto = detectarMapeoAutomatico(encabezados[hoja], tipoEntidad);
    setMapeoColumnas(mapeoAuto);
  };

  const handleMapeoChange = (indexColumna: number, campoDestino: string) => {
    setMapeoColumnas((prev) => {
      const nuevo = [...prev];
      nuevo[indexColumna] = {
        ...nuevo[indexColumna],
        campoDestino,
        requerido: camposDisponibles.find((c) => c.nombre === campoDestino)?.requerido ?? false,
        tipoDato: camposDisponibles.find((c) => c.nombre === campoDestino)?.tipo ?? 'texto',
      };
      return nuevo;
    });
  };

  const procesarDatos = () => {
    const hojaIndex = hojas.indexOf(hojaSeleccionada);
    const datos = datosOriginales[hojaIndex] || [];
    
    const config: ConfiguracionImportacion = {
      tipoEntidad,
      mapeoColumnas,
      filaInicio: 0,
      tieneEncabezados: true,
      columnasIgnorar: mapeoColumnas.filter((m) => !m.campoDestino).map((m) => m.columnaExcel),
      detectarDuplicados: !!campoDuplicado,
      campoDuplicado,
      generarCodigos: generarCodigosAutomaticos,
      prefijoCodigo: prefijoCodigoAutomatico,
    };

    const filas = procesarFilas<T>(datos, mapeoColumnas, config);
    setFilasProcesadas(filas);
    setPaginaActual(0);
    setPaso('preview');
  };

  // ============================================
  // PASO 3: PREVIEW
  // ============================================

  const toggleSeleccion = (index: number) => {
    setFilasProcesadas((prev) => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], seleccionada: !nuevo[index].seleccionada };
      return nuevo;
    });
  };

  const seleccionarTodos = (seleccionar: boolean) => {
    setFilasProcesadas((prev) =>
      prev.map((f) => ({
        ...f,
        seleccionada: f.estado !== 'error' && seleccionar,
      }))
    );
  };

  const estadisticas = obtenerEstadisticas(filasProcesadas);
  const filasPaginadas = filasProcesadas.slice(
    paginaActual * filasPorPagina,
    (paginaActual + 1) * filasPorPagina
  );
  const totalPaginas = Math.ceil(filasProcesadas.length / filasPorPagina);

  // ============================================
  // PASO 4: IMPORTAR
  // ============================================

  const iniciarImportacion = async () => {
    setPaso('importando');
    setLoading(true);
    setError(null);

    try {
      const resultado = await onImportar(filasProcesadas);
      setResultado(resultado);
      setPaso('resultado');
      onComplete?.(resultado);
    } catch (err) {
      setError(`Error durante la importación: ${(err as Error).message}`);
      setPaso('preview');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RESET
  // ============================================

  const reiniciar = () => {
    setArchivo(null);
    setHojas([]);
    setHojaSeleccionada('');
    setEncabezados({});
    setDatosOriginales([]);
    setMapeoColumnas([]);
    setFilasProcesadas([]);
    setResultado(null);
    setError(null);
    setPaso('subir');
    if (inputRef.current) inputRef.current.value = '';
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{titulo}</h2>
          <p className="text-slate-400 mt-1">{descripcion}</p>
        </div>
        {paso !== 'subir' && paso !== 'resultado' && (
          <Button variant="outline" onClick={reiniciar}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reiniciar
          </Button>
        )}
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-2">
        {['subir', 'mapeo', 'preview', 'resultado'].map((p, i) => (
          <div key={p} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                paso === p
                  ? 'bg-cyan-500 text-white'
                  : ['subir', 'mapeo', 'preview', 'resultado'].indexOf(paso) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {['subir', 'mapeo', 'preview', 'resultado'].indexOf(paso) > i ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  ['subir', 'mapeo', 'preview', 'resultado'].indexOf(paso) > i
                    ? 'bg-green-500'
                    : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PASO 1: SUBIR ARCHIVO */}
      {/* ============================================ */}
      {paso === 'subir' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Archivo Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-slate-400">Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-lg text-slate-300 mb-2">
                    Arrastra un archivo Excel aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-slate-500">
                    Formatos soportados: .xlsx, .xls
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Button variant="outline" onClick={descargarPlantilla}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* PASO 2: MAPEO DE COLUMNAS */}
      {/* ============================================ */}
      {paso === 'mapeo' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Mapeo de Columnas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de hoja */}
            {hojas.length > 1 && (
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-400">Hoja:</label>
                <Select 
                  value={hojaSeleccionada} 
                  onChange={handleHojaChange}
                  options={hojas.map((h) => ({ value: h, label: h }))}
                />
              </div>
            )}

            {/* Info del archivo */}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                {archivo?.name}
              </span>
              <span>
                {(datosOriginales[hojas.indexOf(hojaSeleccionada)]?.length || 0).toLocaleString()} filas
              </span>
              <span>{encabezados[hojaSeleccionada]?.length || 0} columnas</span>
            </div>

            {/* Tabla de mapeo */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      Columna Excel
                    </th>
                    <th className="text-center p-3">
                      <ArrowRight className="h-4 w-4 text-slate-500 mx-auto" />
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      Campo Destino
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      Ejemplo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mapeoColumnas.map((mapeo, index) => {
                    const hojaIndex = hojas.indexOf(hojaSeleccionada);
                    const ejemploValor = datosOriginales[hojaIndex]?.[0]?.[mapeo.columnaExcel];
                    
                    return (
                      <tr key={mapeo.columnaExcel} className="border-t border-slate-700">
                        <td className="p-3">
                          <span className="text-slate-200">{mapeo.columnaExcel}</span>
                        </td>
                        <td className="p-3 text-center">
                          <ArrowRight className="h-4 w-4 text-slate-600 mx-auto" />
                        </td>
                        <td className="p-3">
                          <Select
                            value={mapeo.campoDestino || ''}
                            onChange={(v: string) => handleMapeoChange(index, v)}
                            options={[
                              { value: '', label: '-- Ignorar --' },
                              ...camposDisponibles.map((campo) => ({
                                value: campo.nombre,
                                label: `${campo.etiqueta}${campo.requerido ? ' *' : ''}`
                              }))
                            ]}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-slate-500 truncate block max-w-[200px]">
                            {ejemploValor !== undefined && ejemploValor !== null
                              ? String(ejemploValor)
                              : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Acciones */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setPaso('subir')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={procesarDatos}>
                Vista Previa
                <Eye className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* PASO 3: PREVIEW */}
      {/* ============================================ */}
      {paso === 'preview' && (
        <div className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-100">{estadisticas.total}</p>
                <p className="text-sm text-slate-400">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{estadisticas.validos}</p>
                <p className="text-sm text-slate-400">Válidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{estadisticas.advertencias}</p>
                <p className="text-sm text-slate-400">Advertencias</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{estadisticas.errores}</p>
                <p className="text-sm text-slate-400">Errores</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-cyan-400">{estadisticas.seleccionados}</p>
                <p className="text-sm text-slate-400">Seleccionados</p>
              </CardContent>
            </Card>
          </div>

          {/* Acciones de selección */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => seleccionarTodos(true)}>
              Seleccionar válidos
            </Button>
            <Button variant="outline" size="sm" onClick={() => seleccionarTodos(false)}>
              Deseleccionar todos
            </Button>
          </div>

          {/* Tabla de preview */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="w-12 p-3 text-center">
                        <input
                          type="checkbox"
                          checked={estadisticas.seleccionados === estadisticas.total - estadisticas.errores}
                          onChange={(e) => seleccionarTodos(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-700 text-cyan-500"
                        />
                      </th>
                      <th className="w-16 p-3 text-left text-sm font-medium text-slate-300">Fila</th>
                      <th className="w-24 p-3 text-left text-sm font-medium text-slate-300">Estado</th>
                      {mapeoColumnas
                        .filter((m) => m.campoDestino)
                        .map((m) => (
                          <th key={m.campoDestino} className="p-3 text-left text-sm font-medium text-slate-300">
                            {camposDisponibles.find((c) => c.nombre === m.campoDestino)?.etiqueta || m.campoDestino}
                          </th>
                        ))}
                      <th className="p-3 text-left text-sm font-medium text-slate-300">Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasPaginadas.map((fila, index) => {
                      const realIndex = paginaActual * filasPorPagina + index;
                      return (
                        <tr
                          key={fila.numeroFila}
                          className={`border-t border-slate-700 ${
                            fila.estado === 'error' ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={fila.seleccionada}
                              disabled={fila.estado === 'error'}
                              onChange={() => toggleSeleccion(realIndex)}
                              className="rounded border-slate-600 bg-slate-700 text-cyan-500 disabled:opacity-50"
                            />
                          </td>
                          <td className="p-3 text-sm text-slate-400">{fila.numeroFila}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                fila.estado === 'valido'
                                  ? 'default'
                                  : fila.estado === 'advertencia'
                                  ? 'warning'
                                  : fila.estado === 'duplicado'
                                  ? 'secondary'
                                  : 'danger'
                              }
                            >
                              {fila.estado === 'valido' && <Check className="h-3 w-3 mr-1" />}
                              {fila.estado === 'advertencia' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {fila.estado === 'duplicado' && <Copy className="h-3 w-3 mr-1" />}
                              {fila.estado === 'error' && <X className="h-3 w-3 mr-1" />}
                              {fila.estado}
                            </Badge>
                          </td>
                          {mapeoColumnas
                            .filter((m) => m.campoDestino)
                            .map((m) => (
                              <td key={m.campoDestino} className="p-3 text-sm text-slate-300 max-w-[200px] truncate">
                                {String((fila.datosProcesados as Record<string, unknown>)[m.campoDestino] ?? '-')}
                              </td>
                            ))}
                          <td className="p-3 max-w-[300px]">
                            {fila.errores.length > 0 && (
                              <div className="space-y-1">
                                {fila.errores.map((err, i) => (
                                  <p
                                    key={i}
                                    className={`text-xs ${
                                      err.tipo === 'error' ? 'text-red-400' : 'text-amber-400'
                                    }`}
                                  >
                                    {err.columna}: {err.mensaje}
                                  </p>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-700">
                  <span className="text-sm text-slate-400">
                    Mostrando {paginaActual * filasPorPagina + 1} -{' '}
                    {Math.min((paginaActual + 1) * filasPorPagina, filasProcesadas.length)} de{' '}
                    {filasProcesadas.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaActual === 0}
                      onClick={() => setPaginaActual((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400">
                      {paginaActual + 1} / {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaActual >= totalPaginas - 1}
                      onClick={() => setPaginaActual((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setPaso('mapeo')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>
            <Button
              onClick={iniciarImportacion}
              disabled={estadisticas.seleccionados === 0}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Importar {estadisticas.seleccionados} registros
            </Button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PASO 4: IMPORTANDO */}
      {/* ============================================ */}
      {paso === 'importando' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
              <p className="text-lg text-slate-300">Importando datos...</p>
              <p className="text-sm text-slate-500">
                Por favor, no cierre esta ventana
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* PASO 5: RESULTADO */}
      {/* ============================================ */}
      {paso === 'resultado' && resultado && (
        <div className="space-y-6">
          {/* Resumen */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Check className="h-5 w-5" />
                Importación Completada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-3xl font-bold text-slate-100">
                    {resultado.filasImportadas}
                  </p>
                  <p className="text-sm text-slate-400">Importados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-400">{resultado.filasError}</p>
                  <p className="text-sm text-slate-400">Errores</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-400">
                    {resultado.filasDuplicadas}
                  </p>
                  <p className="text-sm text-slate-400">Duplicados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-400">
                    {(resultado.tiempoProcesamiento / 1000).toFixed(1)}s
                  </p>
                  <p className="text-sm text-slate-400">Tiempo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log */}
          <Card>
            <CardHeader>
              <CardTitle>Log de Importación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {resultado.log.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-sm p-2 rounded ${
                      entry.nivel === 'error'
                        ? 'bg-red-500/10 text-red-400'
                        : entry.nivel === 'warning'
                        ? 'bg-amber-500/10 text-amber-400'
                        : entry.nivel === 'success'
                        ? 'bg-green-500/10 text-green-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="text-xs text-slate-500 mr-2">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                    {entry.fila && (
                      <span className="text-xs text-slate-500 mr-2">[Fila {entry.fila}]</span>
                    )}
                    {entry.mensaje}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-center gap-4">
            <Button onClick={reiniciar}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nueva Importación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportadorExcel;
