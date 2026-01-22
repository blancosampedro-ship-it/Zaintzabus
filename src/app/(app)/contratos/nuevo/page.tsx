'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  TextArea,
  LoadingSpinner,
  FormField,
  FormSection,
  FormActions,
} from '@/components/ui';
import {
  crearContrato,
  getOperadoresActivos,
  generarCodigoContrato,
} from '@/lib/firebase/contratos';
import { useAuth } from '@/contexts/AuthContext';
import type { Operador, TipoContrato, ContratoFormData } from '@/types';
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Save,
  ArrowLeft,
  Upload,
  X,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

const TIPOS_CONTRATO: { value: TipoContrato; label: string; descripcion: string }[] = [
  {
    value: 'fijo',
    label: 'Cuota Fija',
    descripcion: 'Cuota mensual fija independiente del número de intervenciones',
  },
  {
    value: 'variable',
    label: 'Por Intervención',
    descripcion: 'Facturación por cada intervención realizada',
  },
  {
    value: 'mixto',
    label: 'Mixto',
    descripcion: 'Cuota base + coste adicional por intervención',
  },
];

export default function NuevoContratoPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [operadores, setOperadores] = useState<Operador[]>([]);

  // Formulario
  const [codigo, setCodigo] = useState('');
  const [operadorId, setOperadorId] = useState('');
  const [tipo, setTipo] = useState<TipoContrato>('variable');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Tarifas fijo
  const [cuotaMensual, setCuotaMensual] = useState('');
  
  // Tarifas variable
  const [costeManoObra, setCosteManoObra] = useState('45');
  const [porcentajeMateriales, setPorcentajeMateriales] = useState('15');
  const [minimoPorSalida, setMinimoPorSalida] = useState('');

  // SLAs
  const [slaCriticaHoras, setSlaCriticaHoras] = useState('4');
  const [slaNormalHoras, setSlaNormalHoras] = useState('24');

  // Equipos
  const [tiposEquipo, setTiposEquipo] = useState<string[]>([]);
  const [exclusiones, setExclusiones] = useState('');

  // Documento
  const [documento, setDocumento] = useState<File | null>(null);

  useEffect(() => {
    cargarOperadores();
  }, []);

  useEffect(() => {
    if (operadorId && operadores.length > 0) {
      const operador = operadores.find((o) => o.id === operadorId);
      if (operador) {
        setCodigo(generarCodigoContrato(operador.codigo, new Date().getFullYear()));
      }
    }
  }, [operadorId, operadores]);

  const cargarOperadores = async () => {
    setLoading(true);
    try {
      const data = await getOperadoresActivos();
      setOperadores(data);
    } catch (error) {
      console.error('Error cargando operadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;

    setGuardando(true);
    try {
      const contratoData: ContratoFormData = {
        codigo,
        operadorId,
        tipo,
        fechaInicio: Timestamp.fromDate(new Date(fechaInicio)),
        fechaFin: fechaFin ? Timestamp.fromDate(new Date(fechaFin)) : undefined,
        tarifas: {
          ...(tipo === 'fijo' || tipo === 'mixto'
            ? {
                fijo: {
                  importePorBusMes: parseFloat(cuotaMensual) || 0,
                },
              }
            : {}),
          ...(tipo === 'variable' || tipo === 'mixto'
            ? {
                variable: {
                  horaIntervencion: parseFloat(costeManoObra) || 45,
                  horaDesplazamiento: parseFloat(costeManoObra) || 45,
                  margenMateriales: (parseFloat(porcentajeMateriales) || 15) / 100,
                  minimoPorSalida: minimoPorSalida ? parseFloat(minimoPorSalida) : undefined,
                },
              }
            : {}),
        },
        slas: {
          criticaHoras: parseInt(slaCriticaHoras) || 4,
          normalHoras: parseInt(slaNormalHoras) || 24,
        },
        tiposEquipoCubiertos: tiposEquipo.length > 0 ? tiposEquipo : undefined,
        exclusiones: exclusiones
          ? exclusiones.split('\n').filter((e) => e.trim())
          : undefined,
      };

      const contratoId = await crearContrato(tenantId, contratoData, user.uid);

      // TODO: Subir documento si existe
      // if (documento) {
      //   await subirDocumentoContrato(tenantId, contratoId, documento, user.uid);
      // }

      router.push('/contratos');
    } catch (error) {
      console.error('Error creando contrato:', error);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contratos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Nuevo Contrato</h1>
          <p className="text-slate-400">Crear un nuevo contrato con un operador</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Operador" required>
                <Select
                  value={operadorId}
                  onChange={setOperadorId}
                  options={[
                    { value: '', label: 'Seleccionar operador...' },
                    ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
                  ]}
                />
              </FormField>

              <FormField label="Código del Contrato" required>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="CTR-XXX-2024-XXXX"
                />
              </FormField>
            </div>

            <FormField label="Tipo de Contrato" required>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TIPOS_CONTRATO.map((t) => (
                  <div
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      tipo === t.value
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    <p className="font-medium text-slate-100">{t.label}</p>
                    <p className="text-sm text-slate-400 mt-1">{t.descripcion}</p>
                  </div>
                ))}
              </div>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Fecha de Inicio" required>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </FormField>

              <FormField label="Fecha de Fin">
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Tarifas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tarifas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(tipo === 'fijo' || tipo === 'mixto') && (
              <FormField label="Cuota Mensual (€)" required={tipo === 'fijo'}>
                <Input
                  type="number"
                  step="0.01"
                  value={cuotaMensual}
                  onChange={(e) => setCuotaMensual(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            )}

            {(tipo === 'variable' || tipo === 'mixto') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Coste Mano de Obra (€/hora)">
                  <Input
                    type="number"
                    step="0.01"
                    value={costeManoObra}
                    onChange={(e) => setCosteManoObra(e.target.value)}
                    placeholder="45.00"
                  />
                </FormField>

                <FormField label="Margen Materiales (%)">
                  <Input
                    type="number"
                    step="1"
                    value={porcentajeMateriales}
                    onChange={(e) => setPorcentajeMateriales(e.target.value)}
                    placeholder="15"
                  />
                </FormField>

                <FormField label="Mínimo por Salida (€)">
                  <Input
                    type="number"
                    step="0.01"
                    value={minimoPorSalida}
                    onChange={(e) => setMinimoPorSalida(e.target.value)}
                    placeholder="0.00"
                  />
                </FormField>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLAs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Acuerdos de Nivel de Servicio (SLA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Tiempo Respuesta Incidencia Crítica (horas)"
                required
              >
                <Input
                  type="number"
                  value={slaCriticaHoras}
                  onChange={(e) => setSlaCriticaHoras(e.target.value)}
                  placeholder="4"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tiempo máximo para atender incidencias críticas
                </p>
              </FormField>

              <FormField
                label="Tiempo Respuesta Incidencia Normal (horas)"
                required
              >
                <Input
                  type="number"
                  value={slaNormalHoras}
                  onChange={(e) => setSlaNormalHoras(e.target.value)}
                  placeholder="24"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tiempo máximo para atender incidencias normales
                </p>
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Exclusiones */}
        <Card>
          <CardHeader>
            <CardTitle>Equipos y Exclusiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Exclusiones">
              <TextArea
                value={exclusiones}
                onChange={(e) => setExclusiones(e.target.value)}
                placeholder="Escribir exclusiones, una por línea..."
                rows={4}
              />
              <p className="text-xs text-slate-500 mt-1">
                Servicios o situaciones no cubiertas por el contrato
              </p>
            </FormField>
          </CardContent>
        </Card>

        {/* Documento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Documento del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
              {documento ? (
                <div className="flex items-center justify-center gap-4">
                  <FileText className="h-8 w-8 text-cyan-400" />
                  <div className="text-left">
                    <p className="font-medium text-slate-200">{documento.name}</p>
                    <p className="text-sm text-slate-400">
                      {(documento.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocumento(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                  />
                  <div>
                    <Upload className="h-8 w-8 text-slate-500 mx-auto" />
                    <p className="text-slate-300 mt-2">
                      Haz clic para subir o arrastra el documento
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      PDF, DOC o DOCX (máx. 10MB)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <FormActions>
          <Link href="/contratos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!operadorId || !fechaInicio || guardando}
          >
            {guardando ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Contrato
              </>
            )}
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
