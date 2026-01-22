'use client';

import { useState, useRef } from 'react';
import { OrdenTrabajo, MaterialOT, ESTADOS_OT } from '@/types';
import { cn } from '@/lib/utils';
import {
  Button,
  TextArea,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
} from '@/components/ui';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Camera,
  Pen,
  Save,
  AlertTriangle,
  PlayCircle,
  StopCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OTEjecucionFormProps {
  orden: OrdenTrabajo;
  onIniciar: () => Promise<void>;
  onCompletar: (data: {
    trabajosRealizados: string;
    materialesUsados: MaterialOT[];
    tiempos: {
      desplazamientoMinutos: number;
      intervencionMinutos: number;
    };
    firmaUrl?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface MaterialForm {
  inventarioId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario?: number;
  tipo: 'sustituido' | 'consumido' | 'reparado';
}

export function OTEjecucionForm({
  orden,
  onIniciar,
  onCompletar,
  onCancel,
  loading,
}: OTEjecucionFormProps) {
  const [trabajosRealizados, setTrabajosRealizados] = useState('');
  const [materiales, setMateriales] = useState<MaterialForm[]>([]);
  const [tiempoDesplazamiento, setTiempoDesplazamiento] = useState(0);
  const [tiempoIntervencion, setTiempoIntervencion] = useState(0);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState<string | undefined>();
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const [tiempoInicio, setTiempoInicio] = useState<Date | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const enCurso = orden.estado === ESTADOS_OT.EN_CURSO;
  const puedeIniciar = orden.estado === ESTADOS_OT.ASIGNADA;

  // Nuevo material temporal
  const [nuevoMaterial, setNuevoMaterial] = useState<MaterialForm>({
    inventarioId: '',
    descripcion: '',
    cantidad: 1,
    tipo: 'sustituido',
  });

  const handleIniciar = async () => {
    await onIniciar();
    setTiempoInicio(new Date());
    setCronometroActivo(true);
  };

  const handleToggleCronometro = () => {
    if (cronometroActivo) {
      // Pausar y calcular tiempo
      if (tiempoInicio) {
        const minutos = Math.round((Date.now() - tiempoInicio.getTime()) / 60000);
        setTiempoIntervencion((prev) => prev + minutos);
      }
      setCronometroActivo(false);
      setTiempoInicio(null);
    } else {
      setTiempoInicio(new Date());
      setCronometroActivo(true);
    }
  };

  const handleAddMaterial = () => {
    if (nuevoMaterial.descripcion && nuevoMaterial.cantidad > 0) {
      setMateriales([...materiales, { ...nuevoMaterial, inventarioId: `temp-${Date.now()}` }]);
      setNuevoMaterial({
        inventarioId: '',
        descripcion: '',
        cantidad: 1,
        tipo: 'sustituido',
      });
      setShowMaterialModal(false);
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index));
  };

  const handleCompletar = async () => {
    // Si el cronómetro está activo, detenerlo
    let tiempoFinal = tiempoIntervencion;
    if (cronometroActivo && tiempoInicio) {
      tiempoFinal += Math.round((Date.now() - tiempoInicio.getTime()) / 60000);
    }

    await onCompletar({
      trabajosRealizados,
      materialesUsados: materiales,
      tiempos: {
        desplazamientoMinutos: tiempoDesplazamiento,
        intervencionMinutos: tiempoFinal,
      },
      firmaUrl,
    });
  };

  // Calcular coste estimado
  const costeEstimado = {
    materiales: materiales.reduce((acc, m) => acc + (m.precioUnitario || 0) * m.cantidad, 0),
    manoObra: (tiempoIntervencion / 60) * 45,
    desplazamiento: (tiempoDesplazamiento / 60) * 30,
    get total() {
      return this.materiales + this.manoObra + this.desplazamiento;
    },
  };

  return (
    <div className="space-y-6">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{orden.codigo}</h2>
          <p className="text-slate-400 text-sm mt-1">
            {orden.origen === 'incidencia' ? 'Correctivo' : 'Preventivo'}
          </p>
        </div>
        <Badge
          variant={enCurso ? 'warning' : puedeIniciar ? 'info' : 'default'}
          className="text-sm px-3 py-1"
        >
          {enCurso ? 'En curso' : puedeIniciar ? 'Lista para iniciar' : orden.estado}
        </Badge>
      </div>

      {/* Acción principal - Iniciar o Cronómetro */}
      {puedeIniciar && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Button
              size="lg"
              onClick={handleIniciar}
              disabled={loading}
              className="w-full md:w-auto text-lg py-6 px-12"
            >
              <PlayCircle className="w-6 h-6 mr-2" />
              Iniciar Trabajo
            </Button>
            <p className="text-slate-400 text-sm mt-4">
              Al iniciar, se registrará la hora de comienzo de la intervención
            </p>
          </CardContent>
        </Card>
      )}

      {enCurso && (
        <>
          {/* Cronómetro */}
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tiempo de intervención</p>
                  <p className="text-3xl font-mono font-bold text-white mt-1">
                    {Math.floor(tiempoIntervencion / 60)}h {tiempoIntervencion % 60}m
                    {cronometroActivo && (
                      <span className="text-purple-400 animate-pulse ml-2">●</span>
                    )}
                  </p>
                </div>
                <Button
                  variant={cronometroActivo ? 'danger' : 'secondary'}
                  size="lg"
                  onClick={handleToggleCronometro}
                >
                  {cronometroActivo ? (
                    <>
                      <StopCircle className="w-5 h-5 mr-2" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Reanudar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tiempo desplazamiento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiempo de desplazamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={0}
                  value={tiempoDesplazamiento}
                  onChange={(e) => setTiempoDesplazamiento(parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <span className="text-slate-400">minutos</span>
              </div>
            </CardContent>
          </Card>

          {/* Trabajos realizados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trabajos realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <TextArea
                value={trabajosRealizados}
                onChange={(e) => setTrabajosRealizados(e.target.value)}
                placeholder="Describe los trabajos realizados..."
                rows={4}
                className="text-base"
              />
            </CardContent>
          </Card>

          {/* Materiales utilizados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Materiales utilizados</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Añadir
              </Button>
            </CardHeader>
            <CardContent>
              {materiales.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  No se han registrado materiales
                </p>
              ) : (
                <div className="space-y-2">
                  {materiales.map((mat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{mat.descripcion}</p>
                        <p className="text-sm text-slate-400">
                          {mat.cantidad} x{' '}
                          {mat.precioUnitario ? `${mat.precioUnitario}€` : 'Sin precio'} -{' '}
                          <span className="capitalize">{mat.tipo}</span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMaterial(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen de costes */}
          <Card className="bg-green-500/10 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-base">Resumen de costes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Materiales</span>
                  <span className="font-mono text-white">
                    {costeEstimado.materiales.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mano de obra</span>
                  <span className="font-mono text-white">
                    {costeEstimado.manoObra.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Desplazamiento</span>
                  <span className="font-mono text-white">
                    {costeEstimado.desplazamiento.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                  <span className="font-semibold text-white">Total</span>
                  <span className="font-mono font-bold text-green-400">
                    {costeEstimado.total.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Firma */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Firma del técnico</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFirmaModal(true)}
              >
                <Pen className="w-4 h-4 mr-1" />
                {firmaUrl ? 'Cambiar' : 'Firmar'}
              </Button>
            </CardHeader>
            <CardContent>
              {firmaUrl ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">Firmado</span>
                </div>
              ) : (
                <p className="text-slate-500">Pendiente de firma</p>
              )}
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={onCancel} className="flex-1">
              <XCircle className="w-5 h-5 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCompletar}
              disabled={loading || !trabajosRealizados.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Completar OT
            </Button>
          </div>
        </>
      )}

      {/* Modal añadir material */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Añadir material"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Descripción
            </label>
            <Input
              value={nuevoMaterial.descripcion}
              onChange={(e) =>
                setNuevoMaterial({ ...nuevoMaterial, descripcion: e.target.value })
              }
              placeholder="Nombre del material"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Cantidad
              </label>
              <Input
                type="number"
                min={1}
                value={nuevoMaterial.cantidad}
                onChange={(e) =>
                  setNuevoMaterial({
                    ...nuevoMaterial,
                    cantidad: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Precio unitario (€)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={nuevoMaterial.precioUnitario || ''}
                onChange={(e) =>
                  setNuevoMaterial({
                    ...nuevoMaterial,
                    precioUnitario: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Tipo de uso
            </label>
            <div className="flex gap-2">
              {(['sustituido', 'consumido', 'reparado'] as const).map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  variant={nuevoMaterial.tipo === tipo ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setNuevoMaterial({ ...nuevoMaterial, tipo })}
                >
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowMaterialModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleAddMaterial} className="flex-1">
              Añadir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal firma - simplificado */}
      <Modal
        isOpen={showFirmaModal}
        onClose={() => setShowFirmaModal(false)}
        title="Firma del técnico"
      >
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 min-h-[200px] flex items-center justify-center border-2 border-dashed border-slate-600">
            <p className="text-slate-500">
              Área de firma táctil
              <br />
              <span className="text-xs">(Implementar canvas para firma real)</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowFirmaModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setFirmaUrl('firma-placeholder-url');
                setShowFirmaModal(false);
              }}
              className="flex-1"
            >
              Confirmar firma
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
