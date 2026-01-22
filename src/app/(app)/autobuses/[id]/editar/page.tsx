'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bus, 
  ArrowLeft, 
  Save,
  Loader2,
  Building2,
  Hash,
  Calendar,
  Radio,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  Select,
} from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Autobus, AutobusFormData, ESTADOS_AUTOBUS, FASES_INSTALACION } from '@/types';

// ==================== TIPOS ====================

interface Operador {
  id: string;
  nombre: string;
}

interface FormErrors {
  codigo?: string;
  matricula?: string;
  marca?: string;
  modelo?: string;
  operadorId?: string;
  general?: string;
}

// ==================== DATOS MOCK ====================

const MOCK_OPERADORES: Operador[] = [
  { id: 'op-001', nombre: 'Bizkaibus' },
  { id: 'op-002', nombre: 'Lurraldebus' },
  { id: 'op-003', nombre: 'Dbus San Sebastián' },
  { id: 'op-004', nombre: 'Bilbobus' },
];

const MARCAS_AUTOBUS = [
  'Mercedes-Benz',
  'Volvo',
  'MAN',
  'Scania',
  'Iveco',
  'Irizar',
  'Solaris',
  'VDL',
  'Otro',
];

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
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
      ))}
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

// ==================== COMPONENTE PRINCIPAL ====================

export default function EditarAutobusPage() {
  const params = useParams();
  const router = useRouter();
  const autobusId = params.id as string;
  
  // Estados
  const [autobus, setAutobus] = useState<Autobus | null>(null);
  const [formData, setFormData] = useState<AutobusFormData | null>(null);
  const [originalCodigo, setOriginalCodigo] = useState<string>('');
  const [originalMatricula, setOriginalMatricula] = useState<string>('');
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loadingAutobus, setLoadingAutobus] = useState(true);
  const [loadingOperadores, setLoadingOperadores] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [checkingMatricula, setCheckingMatricula] = useState(false);

  // Cargar autobús existente
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
            fase: FASES_INSTALACION.COMPLETA,
            fechaPreinstalacion: new Date('2024-01-15') as any,
            fechaInstalacionCompleta: new Date('2024-02-01') as any,
          },
          contadores: {
            totalAverias: 5,
            totalEquipos: 8,
          },
          auditoria: {
            creadoPor: 'admin',
            actualizadoPor: 'admin',
            createdAt: new Date('2024-01-01') as any,
            updatedAt: new Date('2024-01-01') as any,
          },
        };

        setAutobus(mockAutobus);
        setOriginalCodigo(mockAutobus.codigo);
        setOriginalMatricula(mockAutobus.matricula);
        
        // Convertir a form data (omitir campos readonly)
        setFormData({
          codigo: mockAutobus.codigo,
          matricula: mockAutobus.matricula,
          numeroChasis: mockAutobus.numeroChasis,
          marca: mockAutobus.marca,
          modelo: mockAutobus.modelo,
          carroceria: mockAutobus.carroceria,
          anio: mockAutobus.anio,
          operadorId: mockAutobus.operadorId,
          estado: mockAutobus.estado,
          telemetria: mockAutobus.telemetria,
          carteleria: mockAutobus.carteleria,
          instalacion: mockAutobus.instalacion,
        });
      } catch (error) {
        console.error('Error loading autobus:', error);
      } finally {
        setLoadingAutobus(false);
      }
    }

    if (autobusId) {
      loadAutobus();
    }
  }, [autobusId]);

  // Cargar operadores
  useEffect(() => {
    async function loadOperadores() {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        setOperadores(MOCK_OPERADORES);
      } catch (error) {
        console.error('Error loading operadores:', error);
      } finally {
        setLoadingOperadores(false);
      }
    }
    loadOperadores();
  }, []);

  // Validación de código único
  useEffect(() => {
    if (!formData?.codigo || formData.codigo === originalCodigo) {
      setErrors(prev => ({ ...prev, codigo: undefined }));
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCodigo(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        // En producción: verificarCodigoDisponible(formData.codigo, autobusId)
        setErrors(prev => ({ ...prev, codigo: undefined }));
      } finally {
        setCheckingCodigo(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData?.codigo, originalCodigo]);

  // Validación de matrícula única
  useEffect(() => {
    if (!formData?.matricula || formData.matricula === originalMatricula) {
      setErrors(prev => ({ ...prev, matricula: undefined }));
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingMatricula(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        // En producción: verificarMatriculaDisponible(formData.matricula, autobusId)
        setErrors(prev => ({ ...prev, matricula: undefined }));
      } finally {
        setCheckingMatricula(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData?.matricula, originalMatricula]);

  // Handlers
  const handleChange = (field: keyof AutobusFormData, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: FormErrors = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es obligatorio';
    }
    if (!formData.matricula.trim()) {
      newErrors.matricula = 'La matrícula es obligatoria';
    }
    if (!formData.marca?.trim()) {
      newErrors.marca = 'La marca es obligatoria';
    }
    if (!formData.modelo?.trim()) {
      newErrors.modelo = 'El modelo es obligatorio';
    }
    if (!formData.operadorId) {
      newErrors.operadorId = 'Debe seleccionar un operador';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !formData) return;
    if (errors.codigo || errors.matricula) return;

    setSaving(true);
    try {
      // En producción: updateAutobus(autobusId, formData)
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Actualizando autobús:', formData);
      router.push(`/autobuses/${autobusId}`);
    } catch (error) {
      console.error('Error updating autobus:', error);
      setErrors({ general: 'Error al actualizar el autobús. Inténtelo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const hasErrors = Object.values(errors).some(e => e !== undefined);

  // Render states
  if (loadingAutobus) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <LoadingState />
      </div>
    );
  }

  if (!autobus || !formData) {
    return (
      <div className="container mx-auto p-6">
        <NotFoundState />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/autobuses/${autobusId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Autobús</h1>
          <p className="text-muted-foreground">
            {autobus.codigo} • {autobus.matricula}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error general */}
        {errors.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Identificación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Identificación
            </CardTitle>
            <CardDescription>
              Datos identificativos del vehículo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Código Interno <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="codigo"
                    placeholder="BUS-001"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                    className={errors.codigo ? 'border-red-500' : ''}
                  />
                  {checkingCodigo && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.codigo && (
                  <p className="text-sm text-red-500">{errors.codigo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">
                  Matrícula <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="matricula"
                    placeholder="1234-ABC"
                    value={formData.matricula}
                    onChange={(e) => handleChange('matricula', e.target.value.toUpperCase())}
                    className={errors.matricula ? 'border-red-500' : ''}
                  />
                  {checkingMatricula && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.matricula && (
                  <p className="text-sm text-red-500">{errors.matricula}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroChasis">Número de Chasis (VIN)</Label>
              <Input
                id="numeroChasis"
                placeholder="WDB1234567890ABCDE"
                value={formData.numeroChasis || ''}
                onChange={(e) => handleChange('numeroChasis', e.target.value.toUpperCase())}
                maxLength={17}
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos del vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Datos del Vehículo
            </CardTitle>
            <CardDescription>
              Características técnicas del autobús
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marca">
                  Marca <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.marca || ''}
                  onChange={(value) => handleChange('marca', value)}
                  options={MARCAS_AUTOBUS.map((marca) => ({ value: marca, label: marca }))}
                  placeholder="Seleccionar marca"
                  error={!!errors.marca}
                />
                {errors.marca && (
                  <p className="text-sm text-red-500">{errors.marca}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">
                  Modelo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelo"
                  placeholder="Citaro K, 8900, etc."
                  value={formData.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  className={errors.modelo ? 'border-red-500' : ''}
                />
                {errors.modelo && (
                  <p className="text-sm text-red-500">{errors.modelo}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="carroceria">Tipo de Carrocería</Label>
                <Select
                  value={formData.carroceria || ''}
                  onChange={(value) => handleChange('carroceria', value)}
                  options={[
                    { value: 'Urbano', label: 'Urbano' },
                    { value: 'Interurbano', label: 'Interurbano' },
                    { value: 'Articulado', label: 'Articulado' },
                    { value: 'Microbús', label: 'Microbús' },
                    { value: 'Autocar', label: 'Autocar' },
                  ]}
                  placeholder="Seleccionar tipo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anio">Año de Fabricación</Label>
                <Input
                  id="anio"
                  type="number"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  value={formData.anio || ''}
                  onChange={(e) => handleChange('anio', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Operador
            </CardTitle>
            <CardDescription>
              Empresa operadora del vehículo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="operadorId">
                Operador <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.operadorId}
                onChange={(value) => handleChange('operadorId', value)}
                options={operadores.map((op) => ({ value: op.id, label: op.nombre }))}
                placeholder={loadingOperadores ? 'Cargando...' : 'Seleccionar operador'}
                disabled={loadingOperadores}
              />
              {errors.operadorId && (
                <p className="text-sm text-red-500">{errors.operadorId}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sistemas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Sistemas Instalados
            </CardTitle>
            <CardDescription>
              Sistemas activos en el vehículo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Telemetría / FMS</p>
                  <p className="text-sm text-muted-foreground">
                    Sistema de monitorización y gestión de flota
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.telemetria?.tieneFms ?? false}
                onCheckedChange={(checked) => handleChange('telemetria', { tieneFms: checked, fmsConectado: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Cartelería / Información</p>
                  <p className="text-sm text-muted-foreground">
                    Pantallas de información al viajero
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.carteleria?.tiene ?? false}
                onCheckedChange={(checked) => handleChange('carteleria', { tiene: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Estado Actual
            </CardTitle>
            <CardDescription>
              Estado operativo del vehículo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Estado del Vehículo</Label>
              <Select
                value={formData.estado}
                onChange={(value) => handleChange('estado', value)}
                options={[
                  { value: ESTADOS_AUTOBUS.OPERATIVO, label: 'Operativo' },
                  { value: ESTADOS_AUTOBUS.EN_TALLER, label: 'En Taller' },
                  { value: ESTADOS_AUTOBUS.BAJA, label: 'Baja' },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Para gestionar la instalación, use la sección &quot;Registro Instalación&quot;
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/autobuses/${autobusId}`}>Cancelar</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={saving || checkingCodigo || checkingMatricula || hasErrors}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
