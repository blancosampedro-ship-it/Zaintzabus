'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bus, 
  ArrowLeft, 
  Save,
  Loader2,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  FileText,
  User,
  Camera,
  Upload,
  X,
  ChevronRight
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge,
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Skeleton,
  SkeletonCard,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import { TextArea as Textarea } from '@/components/ui/TextArea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Autobus, ESTADOS_AUTOBUS, FASES_INSTALACION, FirestoreTimestamp } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ==================== TIPOS ====================

interface FaseInstalacion {
  fase: string;
  label: string;
  descripcion: string;
  requisitos: string[];
}

interface RegistroFase {
  fecha?: FirestoreTimestamp;
  responsable?: string;
  notas?: string;
  fotos?: string[];
}

// ==================== CONFIGURACIÓN ====================

const FASES: FaseInstalacion[] = [
  {
    fase: FASES_INSTALACION.PENDIENTE,
    label: 'Pendiente',
    descripcion: 'El vehículo está registrado pero no se ha iniciado la instalación',
    requisitos: [
      'Vehículo dado de alta en el sistema',
      'Datos básicos completados',
    ],
  },
  {
    fase: FASES_INSTALACION.PREINSTALACION,
    label: 'Pre-instalación',
    descripcion: 'Se han preparado los elementos y cableado necesarios',
    requisitos: [
      'Cableado tendido',
      'Soportes instalados',
      'Alimentación verificada',
      'Puntos de conexión preparados',
    ],
  },
  {
    fase: FASES_INSTALACION.COMPLETA,
    label: 'Instalación Completa',
    descripcion: 'Todos los equipos están instalados y verificados',
    requisitos: [
      'Equipos instalados y configurados',
      'Comunicaciones verificadas',
      'Test funcional completado',
      'Documentación entregada',
    ],
  },
];

const FASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  [FASES_INSTALACION.PENDIENTE]: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-600 dark:text-slate-400',
  },
  [FASES_INSTALACION.PREINSTALACION]: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-600 dark:text-blue-400',
  },
  [FASES_INSTALACION.COMPLETA]: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-600 dark:text-green-400',
  },
};

// ==================== COMPONENTES AUXILIARES ====================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Bus className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Autobús no encontrado</h2>
      <p className="text-muted-foreground mb-4">
        El autobús que buscas no existe o ha sido eliminado.
      </p>
      <Button asChild>
        <Link href="/autobuses">Volver al listado</Link>
      </Button>
    </div>
  );
}

// Componente de progreso visual
function ProgresoInstalacion({ 
  faseActual, 
  fechaPreinstalacion, 
  fechaInstalacionCompleta 
}: { 
  faseActual: string;
  fechaPreinstalacion?: FirestoreTimestamp;
  fechaInstalacionCompleta?: FirestoreTimestamp;
}) {
  const faseIndex = FASES.findIndex(f => f.fase === faseActual);

  return (
    <div className="relative">
      {/* Línea de conexión */}
      <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-700" />
      <div 
        className="absolute top-6 left-6 h-0.5 bg-green-500 transition-all duration-500"
        style={{ width: `${(faseIndex / (FASES.length - 1)) * 100}%` }}
      />

      {/* Pasos */}
      <div className="relative flex justify-between">
        {FASES.map((fase, index) => {
          const isCompleted = index < faseIndex;
          const isCurrent = index === faseIndex;
          const isPending = index > faseIndex;

          let fecha: FirestoreTimestamp | undefined;
          if (fase.fase === FASES_INSTALACION.PREINSTALACION) {
            fecha = fechaPreinstalacion;
          } else if (fase.fase === FASES_INSTALACION.COMPLETA) {
            fecha = fechaInstalacionCompleta;
          }

          return (
            <div key={fase.fase} className="flex flex-col items-center">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all z-10',
                  isCompleted && 'bg-green-500 border-green-500 text-white',
                  isCurrent && 'bg-blue-500 border-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900',
                  isPending && 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : isCurrent ? (
                  <Clock className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              <p className={cn(
                'mt-2 text-sm font-medium text-center',
                (isCompleted || isCurrent) && 'text-foreground',
                isPending && 'text-muted-foreground'
              )}>
                {fase.label}
              </p>
              {fecha && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(fecha)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tarjeta de fase
function FaseCard({ 
  fase, 
  isActive, 
  isCompleted,
  registro,
  onAdvance,
  canAdvance
}: { 
  fase: FaseInstalacion;
  isActive: boolean;
  isCompleted: boolean;
  registro?: RegistroFase;
  onAdvance: () => void;
  canAdvance: boolean;
}) {
  const colors = FASE_COLORS[fase.fase];

  return (
    <Card className={cn(
      'transition-all',
      isActive && 'ring-2 ring-blue-500',
      isCompleted && 'opacity-75'
    )}>
      <CardHeader className={cn(colors.bg, 'rounded-t-lg')}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isActive ? (
              <Clock className="h-5 w-5 text-blue-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-400" />
            )}
            {fase.label}
          </CardTitle>
          {isCompleted && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              Completada
            </Badge>
          )}
          {isActive && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
              En curso
            </Badge>
          )}
        </div>
        <CardDescription>{fase.descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Requisitos */}
        <div>
          <p className="text-sm font-medium mb-2">Requisitos:</p>
          <ul className="space-y-1">
            {fase.requisitos.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className={cn(
                  'h-4 w-4 mt-0.5 shrink-0',
                  isCompleted ? 'text-green-500' : 'text-slate-300'
                )} />
                <span className={isCompleted ? 'text-muted-foreground line-through' : ''}>
                  {req}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Registro existente */}
        {registro?.fecha && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Registrada el {formatDate(registro.fecha)}</span>
              </div>
              {registro.responsable && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Por {registro.responsable}</span>
                </div>
              )}
              {registro.notas && (
                <div className="p-2 bg-muted rounded text-sm">
                  <p className="italic">&quot;{registro.notas}&quot;</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Botón avanzar */}
        {isActive && canAdvance && (
          <>
            <Separator />
            <Button onClick={onAdvance} className="w-full">
              <ChevronRight className="h-4 w-4 mr-2" />
              Avanzar a siguiente fase
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function InstalacionPage() {
  const params = useParams();
  const router = useRouter();
  const autobusId = params.id as string;

  // Estados
  const [autobus, setAutobus] = useState<Autobus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetFase, setTargetFase] = useState<string | null>(null);
  
  // Formulario para registrar fase
  const [formData, setFormData] = useState({
    notas: '',
    responsable: '',
  });

  // Cargar datos
  useEffect(() => {
    async function loadAutobus() {
      try {
        // En producción: getAutobusById(autobusId)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockAutobus: Autobus = {
          id: autobusId,
          codigo: 'BUS-001',
          matricula: '1234-ABC',
          numeroChasis: 'WDB1234567890',
          marca: 'Mercedes-Benz',
          modelo: 'Citaro K',
          carroceria: 'Urbano',
          anio: 2020,
          operadorId: 'op-001',
          estado: ESTADOS_AUTOBUS.OPERATIVO,
          telemetria: { tieneFms: true, fmsConectado: true },
          carteleria: { tiene: true, tipo: 'LED' },
          instalacion: {
            fase: FASES_INSTALACION.PREINSTALACION,
            fechaPreinstalacion: new Date('2024-06-01') as any,
          },
          contadores: {
            totalAverias: 0,
            totalEquipos: 3,
          },
          auditoria: {
            creadoPor: 'admin',
            actualizadoPor: 'admin',
            createdAt: new Date('2024-01-01') as any,
            updatedAt: new Date('2024-01-01') as any,
          },
        };

        setAutobus(mockAutobus);
      } catch (error) {
        console.error('Error loading autobus:', error);
      } finally {
        setLoading(false);
      }
    }

    if (autobusId) {
      loadAutobus();
    }
  }, [autobusId]);

  // Obtener índice de fase actual
  const getFaseIndex = (fase: string) => FASES.findIndex(f => f.fase === fase);
  const faseActualIndex = autobus ? getFaseIndex(autobus.instalacion?.fase || FASES_INSTALACION.PENDIENTE) : 0;

  // Siguiente fase
  const getNextFase = () => {
    if (faseActualIndex < FASES.length - 1) {
      return FASES[faseActualIndex + 1];
    }
    return null;
  };

  // Handlers
  const handleAdvanceFase = (targetFase: string) => {
    setTargetFase(targetFase);
    setShowConfirmDialog(true);
  };

  const confirmAdvanceFase = async () => {
    if (!targetFase) return;

    setSaving(true);
    try {
      // En producción: registrarFaseInstalacion(autobusId, targetFase, formData)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar estado local
      setAutobus(prev => {
        if (!prev) return null;
        return {
          ...prev,
          instalacion: {
            ...prev.instalacion,
            fase: targetFase as any,
            ...(targetFase === FASES_INSTALACION.PREINSTALACION && {
              fechaPreinstalacion: new Date() as any,
            }),
            ...(targetFase === FASES_INSTALACION.COMPLETA && {
              fechaInstalacionCompleta: new Date() as any,
            }),
          },
        };
      });

      setFormData({ notas: '', responsable: '' });
      setShowConfirmDialog(false);
      setTargetFase(null);
    } catch (error) {
      console.error('Error advancing fase:', error);
    } finally {
      setSaving(false);
    }
  };

  // Render states
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <LoadingState />
      </div>
    );
  }

  if (!autobus) {
    return (
      <div className="container mx-auto p-6">
        <NotFoundState />
      </div>
    );
  }

  const faseActual = autobus.instalacion?.fase || FASES_INSTALACION.PENDIENTE;
  const nextFase = getNextFase();
  const isComplete = faseActual === FASES_INSTALACION.COMPLETA;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/autobuses/${autobusId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registro de Instalación</h1>
          <p className="text-muted-foreground">
            {autobus.codigo} • {autobus.marca} {autobus.modelo}
          </p>
        </div>
      </div>

      {/* Alerta de completado */}
      {isComplete && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Instalación Completada
          </AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            Este vehículo tiene la instalación completada desde el{' '}
            {formatDate(autobus.instalacion?.fechaInstalacionCompleta)}.
          </AlertDescription>
        </Alert>
      )}

      {/* Progreso visual */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Instalación</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgresoInstalacion 
            faseActual={faseActual}
            fechaPreinstalacion={autobus.instalacion?.fechaPreinstalacion}
            fechaInstalacionCompleta={autobus.instalacion?.fechaInstalacionCompleta}
          />
        </CardContent>
      </Card>

      {/* Información de sistemas */}
      <Card>
        <CardHeader>
          <CardTitle>Sistemas a Instalar</CardTitle>
          <CardDescription>
            Equipamiento previsto para este vehículo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={cn(
              'p-4 rounded-lg border',
              autobus.telemetria ? 'bg-green-50 border-green-200 dark:bg-green-950/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-800'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Telemetría / FMS</p>
                  <p className="text-sm text-muted-foreground">
                    Sistema de gestión de flota
                  </p>
                </div>
                {autobus.telemetria ? (
                  <Badge variant="default" className="bg-green-500">Previsto</Badge>
                ) : (
                  <Badge variant="secondary">No requerido</Badge>
                )}
              </div>
            </div>

            <div className={cn(
              'p-4 rounded-lg border',
              autobus.carteleria ? 'bg-green-50 border-green-200 dark:bg-green-950/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-800'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cartelería</p>
                  <p className="text-sm text-muted-foreground">
                    Información al viajero
                  </p>
                </div>
                {autobus.carteleria ? (
                  <Badge variant="default" className="bg-green-500">Previsto</Badge>
                ) : (
                  <Badge variant="secondary">No requerido</Badge>
                )}
              </div>
            </div>
          </div>

          {autobus.contadores?.totalEquipos && autobus.contadores.totalEquipos > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Equipos instalados: {autobus.contadores.totalEquipos}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Ya hay equipos embarcados en este vehículo
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/autobuses/${autobusId}/equipos`}>
                    Ver equipos
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas de fases */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Fases de Instalación</h2>
        <div className="grid gap-4">
          {FASES.map((fase, index) => {
            const isActive = fase.fase === faseActual;
            const isCompleted = index < faseActualIndex;
            const canAdvance = isActive && nextFase !== null;

            // Obtener registro de la fase
            let registro: RegistroFase | undefined;
            if (fase.fase === FASES_INSTALACION.PREINSTALACION && autobus.instalacion?.fechaPreinstalacion) {
              registro = {
                fecha: autobus.instalacion.fechaPreinstalacion,
                responsable: 'Técnico',
              };
            } else if (fase.fase === FASES_INSTALACION.COMPLETA && autobus.instalacion?.fechaInstalacionCompleta) {
              registro = {
                fecha: autobus.instalacion.fechaInstalacionCompleta,
                responsable: 'Técnico',
              };
            }

            return (
              <FaseCard
                key={fase.fase}
                fase={fase}
                isActive={isActive}
                isCompleted={isCompleted}
                registro={registro}
                onAdvance={() => nextFase && handleAdvanceFase(nextFase.fase)}
                canAdvance={canAdvance}
              />
            );
          })}
        </div>
      </div>

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Avanzar a {targetFase && FASES.find(f => f.fase === targetFase)?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Registrar que se ha completado la fase actual y avanzar a la siguiente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                placeholder="Nombre del técnico"
                value={formData.responsable}
                onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                placeholder="Observaciones sobre la fase completada..."
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdvanceFase} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
