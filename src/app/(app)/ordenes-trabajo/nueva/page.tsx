'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createOrdenTrabajo, crearOTDesdeIncidencia } from '@/lib/firebase/ordenes-trabajo';
import { getIncidenciaById } from '@/lib/firebase/incidencias';
import { Incidencia, TIPOS_OT, TipoOT } from '@/types';
import {
  Button,
  Input,
  Select,
  TextArea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  LoadingSpinner,
  Badge,
} from '@/components/ui';
import { ArrowLeft, AlertTriangle, Wrench, Calendar, Zap } from 'lucide-react';

const TIPO_OPTIONS = [
  { value: TIPOS_OT.CORRECTIVO_URGENTE, label: 'Correctivo Urgente' },
  { value: TIPOS_OT.CORRECTIVO_PROGRAMADO, label: 'Correctivo Programado' },
  { value: TIPOS_OT.PREVENTIVO, label: 'Preventivo' },
];

const CRITICIDAD_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'critica', label: 'Crítica' },
];

export default function NuevaOTPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { claims, usuario } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [incidenciaOrigen, setIncidenciaOrigen] = useState<Incidencia | null>(null);
  const [loadingIncidencia, setLoadingIncidencia] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<TipoOT>(TIPOS_OT.CORRECTIVO_PROGRAMADO);
  const [criticidad, setCriticidad] = useState<'critica' | 'normal'>('normal');
  const [descripcion, setDescripcion] = useState('');
  const [autobusId, setAutobusId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [fechaPrevista, setFechaPrevista] = useState('');

  const incidenciaId = searchParams.get('incidencia');

  useEffect(() => {
    async function loadIncidencia() {
      if (!incidenciaId || !claims?.tenantId) return;

      setLoadingIncidencia(true);
      try {
        const inc = await getIncidenciaById(claims.tenantId, incidenciaId);
        if (inc) {
          setIncidenciaOrigen(inc);
          // Prerellenar datos desde incidencia
          setCriticidad(inc.criticidad);
          setTipo(inc.criticidad === 'critica' ? TIPOS_OT.CORRECTIVO_URGENTE : TIPOS_OT.CORRECTIVO_PROGRAMADO);
          setDescripcion(`Desde incidencia ${inc.codigo}: ${inc.naturalezaFallo}`);
        }
      } catch (error) {
        console.error('Error loading incidencia:', error);
      } finally {
        setLoadingIncidencia(false);
      }
    }

    loadIncidencia();
  }, [incidenciaId, claims?.tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claims?.tenantId || !usuario) return;

    setLoading(true);
    try {
      let otId: string;

      if (incidenciaOrigen) {
        // Crear desde incidencia
        otId = await crearOTDesdeIncidencia(
          claims.tenantId,
          incidenciaOrigen.id,
          {
            codigo: incidenciaOrigen.codigo,
            criticidad: incidenciaOrigen.criticidad,
            autobusId: autobusId || undefined,
            operadorId: undefined,
          },
          usuario.id,
          tipo === TIPOS_OT.CORRECTIVO_URGENTE
        );
      } else {
        // Crear OT manual
        otId = await createOrdenTrabajo(
          claims.tenantId,
          {
            origen: 'incidencia', // Por defecto
            tipo,
            criticidad,
            autobusId: autobusId || undefined,
            tecnicoId: tecnicoId || undefined,
            planificacion: fechaPrevista
              ? { fechaPrevista: new Date(fechaPrevista) as any }
              : undefined,
          },
          usuario.id
        );
      }

      router.push(`/ordenes-trabajo/${otId}`);
    } catch (error) {
      console.error('Error creating OT:', error);
      alert('Error al crear la orden de trabajo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/ordenes-trabajo"
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nueva Orden de Trabajo</h1>
          <p className="text-slate-400 text-sm">
            {incidenciaOrigen
              ? `Creando OT desde incidencia ${incidenciaOrigen.codigo}`
              : 'Crear una nueva orden de trabajo'}
          </p>
        </div>
      </div>

      {/* Incidencia origen */}
      {loadingIncidencia ? (
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center justify-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-slate-400">Cargando incidencia...</span>
          </CardContent>
        </Card>
      ) : incidenciaOrigen ? (
        <Card className="mb-6 bg-yellow-500/10 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              Incidencia Origen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono font-bold text-white">{incidenciaOrigen.codigo}</p>
                <p className="text-sm text-slate-400 mt-1">{incidenciaOrigen.naturalezaFallo}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={incidenciaOrigen.criticidad === 'critica' ? 'danger' : 'default'}>
                    {incidenciaOrigen.criticidad === 'critica' ? 'Crítica' : 'Normal'}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/incidencias/${incidenciaOrigen.id}`}
                className="text-sm text-blue-400 hover:underline"
              >
                Ver incidencia
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Tipo de OT
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TIPO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTipo(option.value as TipoOT)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      tipo === option.value
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xl mb-1">
                      {option.value === TIPOS_OT.CORRECTIVO_URGENTE ? '⚡' : 
                       option.value === TIPOS_OT.PREVENTIVO ? '📋' : '🔧'}
                    </div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Criticidad (si no viene de incidencia) */}
            {!incidenciaOrigen && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Criticidad
                </label>
                <Select
                  value={criticidad}
                  onChange={(value) => setCriticidad(value as 'critica' | 'normal')}
                  options={CRITICIDAD_OPTIONS}
                />
              </div>
            )}

            {/* Autobús */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Autobús (opcional)
              </label>
              <Input
                value={autobusId}
                onChange={(e) => setAutobusId(e.target.value)}
                placeholder="ID del autobús"
              />
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Asignar a técnico (opcional)
              </label>
              <Input
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                placeholder="ID del técnico"
              />
            </div>

            {/* Fecha prevista */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Fecha prevista (opcional)
              </label>
              <Input
                type="date"
                value={fechaPrevista}
                onChange={(e) => setFechaPrevista(e.target.value)}
              />
            </div>

            {/* Descripción adicional (si no es desde incidencia) */}
            {!incidenciaOrigen && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Descripción
                </label>
                <TextArea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del trabajo a realizar..."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex gap-4 mt-6">
          <Link href="/ordenes-trabajo" className="flex-1">
            <Button variant="ghost" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creando...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Crear OT
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
