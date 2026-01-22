'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
} from '@/components/ui';
import { ImportadorExcel } from '@/components/importacion';
import { importarFlota } from '@/lib/importacion';
import { useAuth } from '@/contexts/AuthContext';
import type { FilaImportacion, PlantillaFlota, ResultadoImportacion } from '@/types';
import type { TabItem } from '@/components/ui/Tabs';
import {
  Bus,
  Upload,
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

// Campos disponibles para mapeo de flota
const CAMPOS_FLOTA = [
  { nombre: 'codigo', etiqueta: 'Código Interno', requerido: false, tipo: 'texto' as const },
  { nombre: 'matricula', etiqueta: 'Matrícula', requerido: true, tipo: 'texto' as const },
  { nombre: 'marca', etiqueta: 'Marca', requerido: false, tipo: 'texto' as const },
  { nombre: 'modelo', etiqueta: 'Modelo', requerido: false, tipo: 'texto' as const },
  { nombre: 'numeroSerie', etiqueta: 'Nº Serie / Bastidor', requerido: false, tipo: 'texto' as const },
  { nombre: 'anioFabricacion', etiqueta: 'Año Fabricación', requerido: false, tipo: 'numero' as const },
  { nombre: 'fechaAlta', etiqueta: 'Fecha Alta', requerido: false, tipo: 'fecha' as const },
  { nombre: 'kilometraje', etiqueta: 'Kilometraje', requerido: false, tipo: 'numero' as const },
  { nombre: 'ubicacionBase', etiqueta: 'Ubicación/Cochera', requerido: false, tipo: 'texto' as const },
  { nombre: 'operador', etiqueta: 'Operador', requerido: false, tipo: 'texto' as const },
  { nombre: 'estado', etiqueta: 'Estado', requerido: false, tipo: 'texto' as const },
  { nombre: 'notas', etiqueta: 'Notas', requerido: false, tipo: 'texto' as const },
];

export default function ImportarFlotaPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId || 'default';

  const [tabIndex, setTabIndex] = useState(0);
  const [historialImportaciones, setHistorialImportaciones] = useState<ResultadoImportacion[]>([]);
  
  // Opciones de importación
  const [opciones, setOpciones] = useState({
    generarCodigosAutomaticos: true,
    prefijoCodigosAutomaticos: 'BUS',
    crearMovimientosAlta: true,
  });

  const handleImportar = async (
    filas: FilaImportacion<PlantillaFlota>[]
  ): Promise<ResultadoImportacion> => {
    if (!user) throw new Error('Usuario no autenticado');

    const resultado = await importarFlota(tenantId, filas, user.uid, {
      generarCodigosAutomaticos: opciones.generarCodigosAutomaticos,
      prefijoCodigosAutomaticos: opciones.prefijoCodigosAutomaticos,
      crearMovimientosAlta: opciones.crearMovimientosAlta,
    });

    // Guardar en historial local
    setHistorialImportaciones((prev) => [resultado, ...prev].slice(0, 10));

    return resultado;
  };

  const handleComplete = () => {
    // Cambiar a pestaña de historial
    setTabIndex(2);
  };

  // Definir contenido de tabs
  const tabsConfig: TabItem[] = useMemo(() => [
    {
      id: 'importar',
      label: 'Importar',
      icon: <Upload className="h-4 w-4" />,
      content: (
        <ImportadorExcel<PlantillaFlota>
          tipoEntidad="flota"
          titulo="Importador de Flota"
          descripcion="Sube un archivo Excel con los datos de los autobuses. El sistema detectará automáticamente las columnas y te permitirá mapearlas."
          camposDisponibles={CAMPOS_FLOTA}
          onImportar={handleImportar}
          onComplete={handleComplete}
          prefijoCodigoAutomatico={opciones.prefijoCodigosAutomaticos}
          generarCodigosAutomaticos={opciones.generarCodigosAutomaticos}
          campoDuplicado="matricula"
        />
      ),
    },
    {
      id: 'opciones',
      label: 'Opciones',
      icon: <Settings className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Opciones de Importación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Códigos automáticos */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opciones.generarCodigosAutomaticos}
                  onChange={(e) =>
                    setOpciones({ ...opciones, generarCodigosAutomaticos: e.target.checked })
                  }
                  className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm text-slate-300">
                    Generar códigos internos automáticamente
                  </span>
                  <p className="text-xs text-slate-500">
                    Si el Excel no incluye código, se generará uno secuencial
                  </p>
                </div>
              </label>

              {opciones.generarCodigosAutomaticos && (
                <div className="ml-7">
                  <label className="text-sm text-slate-400">Prefijo para códigos:</label>
                  <input
                    type="text"
                    value={opciones.prefijoCodigosAutomaticos}
                    onChange={(e) =>
                      setOpciones({
                        ...opciones,
                        prefijoCodigosAutomaticos: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="BUS"
                    maxLength={5}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ejemplo: {opciones.prefijoCodigosAutomaticos}-001,{' '}
                    {opciones.prefijoCodigosAutomaticos}-002...
                  </p>
                </div>
              )}
            </div>

            {/* Movimientos de alta */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.crearMovimientosAlta}
                onChange={(e) =>
                  setOpciones({ ...opciones, crearMovimientosAlta: e.target.checked })
                }
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm text-slate-300">
                  Crear movimientos de alta automáticamente
                </span>
                <p className="text-xs text-slate-500">
                  Registra un movimiento de entrada por cada autobús importado
                </p>
              </div>
            </label>

            {/* Info adicional */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Formato del Excel esperado
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Primera fila: encabezados de columnas</li>
                <li>• Campo obligatorio: Matrícula (debe ser único)</li>
                <li>• Se detectan automáticamente columnas comunes</li>
                <li>• Formatos de fecha soportados: DD/MM/YYYY, YYYY-MM-DD</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: <History className="h-4 w-4" />,
      badge: historialImportaciones.length > 0 ? historialImportaciones.length : undefined,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Importaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {historialImportaciones.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No hay importaciones recientes</p>
                <p className="text-sm text-slate-500">
                  Las importaciones de esta sesión aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historialImportaciones.map((resultado, index) => (
                  <div
                    key={index}
                    className="p-4 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {resultado.filasError === 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-400" />
                        )}
                        <div>
                          <p className="text-slate-100">
                            {resultado.filasImportadas} autobuses importados
                          </p>
                          <p className="text-xs text-slate-500">
                            {resultado.fecha.toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {resultado.filasError > 0 && (
                          <Badge variant="danger">{resultado.filasError} errores</Badge>
                        )}
                        {resultado.filasDuplicadas > 0 && (
                          <Badge variant="secondary">{resultado.filasDuplicadas} duplicados</Badge>
                        )}
                        <span className="text-slate-500">
                          {(resultado.tiempoProcesamiento / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ),
    },
  ], [opciones, historialImportaciones]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/importar">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Bus className="h-6 w-6 text-cyan-400" />
              Importar Flota
            </h1>
            <p className="text-slate-400 mt-1">
              Importa autobuses desde un archivo Excel
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabsConfig}
        defaultIndex={tabIndex}
        onChange={setTabIndex}
      />
    </div>
  );
}
