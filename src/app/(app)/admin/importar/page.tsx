'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/ui';
import {
  Upload,
  Bus,
  Users,
  History,
  FileSpreadsheet,
  ArrowRight,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { generarPlantillaExcel } from '@/lib/importacion';

const IMPORTADORES = [
  {
    id: 'flota',
    titulo: 'Flota de Autobuses',
    descripcion: 'Importa autobuses con matrículas, marcas, modelos y datos técnicos',
    icon: Bus,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    href: '/admin/importar/flota',
    camposRequeridos: ['Matrícula'],
    camposOpcionales: ['Código', 'Marca', 'Modelo', 'Año', 'Km'],
    recomendado: true,
  },
  {
    id: 'tecnicos',
    titulo: 'Técnicos y Usuarios',
    descripcion: 'Importa el equipo de mantenimiento con emails, roles y especialidades',
    icon: Users,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    href: '/admin/importar/tecnicos',
    camposRequeridos: ['Email', 'Nombre', 'Apellidos'],
    camposOpcionales: ['Teléfono', 'Rol', 'Especialidades'],
  },
  {
    id: 'historico',
    titulo: 'Histórico de Incidencias',
    descripcion: 'Importa el historial de averías y mantenimientos pasados',
    icon: History,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    href: '/admin/importar/historico',
    camposRequeridos: ['Autobús', 'Fecha', 'Descripción'],
    camposOpcionales: ['Tipo', 'Técnico', 'Horas', 'Materiales'],
    requierePrevio: 'Requiere importar flota primero',
  },
];

export default function ImportarPage() {
  const descargarPlantilla = (tipo: 'flota' | 'tecnicos' | 'historico') => {
    const blob = generarPlantillaExcel(tipo);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${tipo}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Upload className="h-6 w-6 text-cyan-400" />
          Importación de Datos
        </h1>
        <p className="text-slate-400 mt-1">
          Migra datos existentes desde archivos Excel al sistema
        </p>
      </div>

      {/* Instrucciones */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-200">¿Cómo funciona?</h3>
              <ol className="text-sm text-slate-400 mt-2 space-y-1 list-decimal list-inside">
                <li>Descarga la plantilla Excel del tipo de dato que quieres importar</li>
                <li>Rellena los datos siguiendo el formato de la plantilla</li>
                <li>Sube el archivo y mapea las columnas si es necesario</li>
                <li>Revisa la vista previa y confirma la importación</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orden recomendado */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          <CheckCircle2 className="h-4 w-4 inline mr-2 text-green-400" />
          Orden recomendado de importación
        </h3>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-300">1. Flota</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-2 py-1 bg-green-500/20 rounded text-green-300">2. Técnicos</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-2 py-1 bg-amber-500/20 rounded text-amber-300">3. Histórico</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          El histórico necesita que existan los autobuses para poder vincular las incidencias
        </p>
      </div>

      {/* Grid de importadores */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {IMPORTADORES.map((importador) => {
          const Icon = importador.icon;
          return (
            <Card
              key={importador.id}
              className="hover:border-slate-600 transition-colors relative overflow-hidden"
            >
              {importador.recomendado && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-cyan-500">
                    Empezar aquí
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${importador.bgColor}`}>
                    <Icon className={`h-6 w-6 ${importador.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{importador.titulo}</CardTitle>
                    <p className="text-sm text-slate-400 mt-1">{importador.descripcion}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campos */}
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-500">Campos requeridos:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importador.camposRequeridos.map((campo) => (
                        <Badge key={campo} variant="default" className="text-xs">
                          {campo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Campos opcionales:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importador.camposOpcionales.map((campo) => (
                        <Badge key={campo} variant="outline" className="text-xs">
                          {campo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advertencia si requiere previo */}
                {importador.requierePrevio && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {importador.requierePrevio}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => descargarPlantilla(importador.id as 'flota' | 'tecnicos' | 'historico')}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Plantilla
                  </Button>
                  <Link href={importador.href} className="flex-1">
                    <Button size="sm" className="w-full">
                      Importar
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-400">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-slate-300 mb-2">Formatos soportados</h4>
              <ul className="space-y-1">
                <li>• Microsoft Excel (.xlsx)</li>
                <li>• Excel 97-2003 (.xls)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-2">Límites</h4>
              <ul className="space-y-1">
                <li>• Máximo 5,000 filas por importación</li>
                <li>• Tamaño máximo de archivo: 10 MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-2">Detección de duplicados</h4>
              <ul className="space-y-1">
                <li>• Flota: por matrícula</li>
                <li>• Técnicos: por email</li>
                <li>• Histórico: no se detectan duplicados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-2">En caso de error</h4>
              <ul className="space-y-1">
                <li>• Las filas con error se omiten</li>
                <li>• Las filas válidas se importan</li>
                <li>• Se genera un log detallado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
