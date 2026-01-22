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
  Select,
} from '@/components/ui';
import { ImportadorExcel } from '@/components/importacion';
import { importarTecnicos } from '@/lib/importacion';
import { useAuth } from '@/contexts/AuthContext';
import type { FilaImportacion, PlantillaTecnicos, ResultadoImportacion } from '@/types';
import type { TabItem } from '@/components/ui/Tabs';
import {
  Users,
  Upload,
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

// Campos disponibles para mapeo de técnicos
const CAMPOS_TECNICOS = [
  { nombre: 'email', etiqueta: 'Email', requerido: true, tipo: 'texto' as const },
  { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, tipo: 'texto' as const },
  { nombre: 'apellidos', etiqueta: 'Apellidos', requerido: true, tipo: 'texto' as const },
  { nombre: 'telefono', etiqueta: 'Teléfono', requerido: false, tipo: 'texto' as const },
  { nombre: 'rol', etiqueta: 'Rol', requerido: false, tipo: 'texto' as const },
  { nombre: 'especialidades', etiqueta: 'Especialidades', requerido: false, tipo: 'texto' as const },
  { nombre: 'activo', etiqueta: 'Activo', requerido: false, tipo: 'booleano' as const },
];

// Roles disponibles
const ROLES_DISPONIBLES = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'jefe_mantenimiento', label: 'Jefe de Mantenimiento' },
  { value: 'operador', label: 'Operador' },
  { value: 'admin', label: 'Administrador' },
];

export default function ImportarTecnicosPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId || 'default';

  const [tabIndex, setTabIndex] = useState(0);
  const [historialImportaciones, setHistorialImportaciones] = useState<ResultadoImportacion[]>([]);

  // Opciones de importación
  const [opciones, setOpciones] = useState({
    rolPorDefecto: 'tecnico',
    enviarInvitaciones: false,
  });

  const handleImportar = async (
    filas: FilaImportacion<PlantillaTecnicos>[]
  ): Promise<ResultadoImportacion> => {
    if (!user) throw new Error('Usuario no autenticado');

    const resultado = await importarTecnicos(tenantId, filas, user.uid, {
      rolPorDefecto: opciones.rolPorDefecto,
      enviarInvitaciones: opciones.enviarInvitaciones,
    });

    // Guardar en historial local
    setHistorialImportaciones((prev) => [resultado, ...prev].slice(0, 10));

    return resultado;
  };

  const handleComplete = () => {
    setTabIndex(2);
  };

  // Definir contenido de tabs
  const tabsConfig: TabItem[] = useMemo(() => [
    {
      id: 'importar',
      label: 'Importar',
      icon: <Upload className="h-4 w-4" />,
      content: (
        <ImportadorExcel<PlantillaTecnicos>
          tipoEntidad="tecnicos"
          titulo="Importador de Técnicos"
          descripcion="Sube un archivo Excel con los datos de los técnicos y usuarios. El email es obligatorio y debe ser único."
          camposDisponibles={CAMPOS_TECNICOS}
          onImportar={handleImportar}
          onComplete={handleComplete}
          campoDuplicado="email"
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
            {/* Rol por defecto */}
            <div className="space-y-3">
              <label className="text-sm text-slate-400">Rol por defecto:</label>
              <Select
                value={opciones.rolPorDefecto}
                onChange={(v) => setOpciones({ ...opciones, rolPorDefecto: v })}
                options={ROLES_DISPONIBLES}
              />
              <p className="text-xs text-slate-500">
                Se asignará este rol a los usuarios que no tengan uno especificado en el Excel
              </p>
            </div>

            {/* Enviar invitaciones */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opciones.enviarInvitaciones}
                onChange={(e) =>
                  setOpciones({ ...opciones, enviarInvitaciones: e.target.checked })
                }
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm text-slate-300">
                  Enviar invitaciones por email
                </span>
                <p className="text-xs text-slate-500">
                  Los usuarios recibirán un email para configurar su contraseña
                </p>
              </div>
            </label>

            {/* Advertencia de seguridad */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-400">Nota de Seguridad</h4>
                  <p className="text-xs text-amber-300/80 mt-1">
                    Los usuarios importados se crean con estado activo. Deberán establecer su
                    contraseña mediante el enlace de recuperación o una invitación. Revisa
                    cuidadosamente los roles asignados antes de importar.
                  </p>
                </div>
              </div>
            </div>

            {/* Info adicional */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Formato del Excel esperado
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Primera fila: encabezados de columnas</li>
                <li>• Campos obligatorios: Email, Nombre, Apellidos</li>
                <li>• El email debe ser único en el sistema</li>
                <li>• Roles válidos: tecnico, jefe_mantenimiento, operador, admin</li>
                <li>• Activo: Sí/No, True/False, 1/0</li>
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
                            {resultado.filasImportadas} técnicos importados
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
              <Users className="h-6 w-6 text-cyan-400" />
              Importar Técnicos
            </h1>
            <p className="text-slate-400 mt-1">
              Importa usuarios y técnicos desde un archivo Excel
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
