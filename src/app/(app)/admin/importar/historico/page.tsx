'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  LoadingSpinner,
} from '@/components/ui';
import { ImportadorExcel } from '@/components/importacion';
import { importarHistorico } from '@/lib/importacion';
import { getActivos } from '@/lib/firebase/activos';
import { useAuth } from '@/contexts/AuthContext';
import type { FilaImportacion, PlantillaHistorico, ResultadoImportacion, Activo } from '@/types';
import type { TabItem } from '@/components/ui/Tabs';
import {
  History,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Bus,
} from 'lucide-react';
import Link from 'next/link';

// Campos disponibles para mapeo de histórico
const CAMPOS_HISTORICO = [
  { nombre: 'codigoActivo', etiqueta: 'Código/Matrícula Autobús', requerido: true, tipo: 'texto' as const },
  { nombre: 'fecha', etiqueta: 'Fecha', requerido: true, tipo: 'fecha' as const },
  { nombre: 'descripcion', etiqueta: 'Descripción/Avería', requerido: true, tipo: 'texto' as const },
  { nombre: 'tipo', etiqueta: 'Tipo (Preventiva/Correctiva)', requerido: false, tipo: 'texto' as const },
  { nombre: 'estadoFinal', etiqueta: 'Estado Final', requerido: false, tipo: 'texto' as const },
  { nombre: 'tecnico', etiqueta: 'Técnico', requerido: false, tipo: 'texto' as const },
  { nombre: 'tiempoResolucion', etiqueta: 'Tiempo Resolución (horas)', requerido: false, tipo: 'numero' as const },
  { nombre: 'materiales', etiqueta: 'Materiales/Repuestos', requerido: false, tipo: 'texto' as const },
  { nombre: 'coste', etiqueta: 'Coste (€)', requerido: false, tipo: 'numero' as const },
];

export default function ImportarHistoricoPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId || 'default';

  const [tabIndex, setTabIndex] = useState(0);
  const [historialImportaciones, setHistorialImportaciones] = useState<ResultadoImportacion[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(true);

  // Cargar activos para validación
  useEffect(() => {
    const cargarActivos = async () => {
      try {
        const data = await getActivos(tenantId);
        setActivos(data);
      } catch (error) {
        console.error('Error cargando activos:', error);
      } finally {
        setLoadingActivos(false);
      }
    };
    cargarActivos();
  }, [tenantId]);

  // Crear mapeo de activos
  const mapeoActivos = useMemo(() => {
    const mapa = new Map<string, string>();
    activos.forEach((activo) => {
      if (activo.codigo) mapa.set(activo.codigo.toLowerCase(), activo.id);
      if (activo.matricula) mapa.set(activo.matricula.toLowerCase(), activo.id);
    });
    return mapa;
  }, [activos]);

  const handleImportar = async (
    filas: FilaImportacion<PlantillaHistorico>[]
  ): Promise<ResultadoImportacion> => {
    if (!user) throw new Error('Usuario no autenticado');

    const resultado = await importarHistorico(tenantId, filas, user.uid, {
      mapeoActivos,
    });

    // Guardar en historial local
    setHistorialImportaciones((prev) => [resultado, ...prev].slice(0, 10));

    return resultado;
  };

  const handleComplete = () => {
    setTabIndex(2);
  };

  // Activos sin histórico (sugerencia)
  const activosSinHistorico = activos.filter((a) => a.tipo === 'autobus').slice(0, 10);

  // Definir contenido de tabs
  const tabsConfig: TabItem[] = useMemo(() => [
    {
      id: 'importar',
      label: 'Importar',
      icon: <Upload className="h-4 w-4" />,
      content: (
        <ImportadorExcel<PlantillaHistorico>
          tipoEntidad="historico"
          titulo="Importador de Histórico"
          descripcion="Sube un archivo Excel con el histórico de incidencias y averías. Incluye código/matrícula del autobús, fecha y descripción."
          camposDisponibles={CAMPOS_HISTORICO}
          onImportar={handleImportar}
          onComplete={handleComplete}
        />
      ),
    },
    {
      id: 'info',
      label: 'Información',
      icon: <Settings className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Información de Importación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formato esperado */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Formato del Excel esperado
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Primera fila: encabezados de columnas</li>
                <li>• Campos obligatorios: Código/Matrícula, Fecha, Descripción</li>
                <li>• El código/matrícula debe coincidir con un activo existente</li>
                <li>• Tipos válidos: Preventiva, Correctiva</li>
                <li>• Las incidencias se importarán como cerradas</li>
              </ul>
            </div>

            {/* Cómo se procesan los datos */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Procesamiento de datos
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>
                  <strong>Activos:</strong> Se busca por código interno o matrícula (no distingue
                  mayúsculas)
                </li>
                <li>
                  <strong>Técnicos:</strong> Se busca por nombre completo o solo nombre
                </li>
                <li>
                  <strong>Códigos:</strong> Se generan códigos de incidencia automáticamente
                  (INC-XXXXX)
                </li>
                <li>
                  <strong>Estado:</strong> Todas las incidencias se importan como &quot;cerradas&quot;
                </li>
              </ul>
            </div>

            {/* Ejemplo de Excel */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Ejemplo de datos</h4>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-2 text-slate-400">Autobús</th>
                      <th className="text-left p-2 text-slate-400">Fecha</th>
                      <th className="text-left p-2 text-slate-400">Descripción</th>
                      <th className="text-left p-2 text-slate-400">Tipo</th>
                      <th className="text-left p-2 text-slate-400">Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800">
                      <td className="p-2">EKI-001</td>
                      <td className="p-2">15/01/2024</td>
                      <td className="p-2">Cambio aceite y filtros</td>
                      <td className="p-2">Preventiva</td>
                      <td className="p-2">Juan García</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="p-2">1234-ABC</td>
                      <td className="p-2">20/01/2024</td>
                      <td className="p-2">Fallo sistema frenos</td>
                      <td className="p-2">Correctiva</td>
                      <td className="p-2">María López</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                            {resultado.filasImportadas} registros históricos importados
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
                        {resultado.filasAdvertencia > 0 && (
                          <Badge variant="warning">
                            {resultado.filasAdvertencia} advertencias
                          </Badge>
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
  ], [activos, historialImportaciones, mapeoActivos]);

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
              <History className="h-6 w-6 text-cyan-400" />
              Importar Histórico
            </h1>
            <p className="text-slate-400 mt-1">
              Importa incidencias y averías históricas desde un archivo Excel
            </p>
          </div>
        </div>
      </div>

      {/* Advertencia */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-400">Antes de importar</h4>
            <p className="text-xs text-amber-300/80 mt-1">
              Asegúrate de haber importado primero la flota de autobuses. El sistema intentará
              vincular cada registro del histórico con el autobús correspondiente usando el código
              o matrícula.
            </p>
          </div>
        </div>
      </div>

      {/* Info de activos disponibles */}
      {loadingActivos ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <span className="text-slate-400">Cargando activos...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bus className="h-5 w-5 text-cyan-400" />
                <span className="text-slate-300">
                  <strong>{activos.filter((a) => a.tipo === 'autobus').length}</strong> autobuses
                  disponibles para vincular
                </span>
              </div>
              {activos.length === 0 && (
                <Link href="/admin/importar/flota">
                  <Button variant="outline" size="sm">
                    Importar flota primero
                  </Button>
                </Link>
              )}
            </div>
            {activosSinHistorico.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">Códigos disponibles:</span>
                {activosSinHistorico.map((a) => (
                  <Badge key={a.id} variant="secondary" className="text-xs">
                    {a.codigo || a.matricula}
                  </Badge>
                ))}
                {activos.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{activos.length - 10} más
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        tabs={tabsConfig}
        defaultIndex={tabIndex}
        onChange={setTabIndex}
      />
    </div>
  );
}
