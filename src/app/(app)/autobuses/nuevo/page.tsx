'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bus, 
  ArrowLeft, 
  Save,
  Loader2,
  Building2,
  Hash,
  FileText,
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
  CardTitle 
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AutobusFormData, ESTADOS_AUTOBUS, FASES_INSTALACION } from '@/types';

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

// ==================== FORMULARIO INICIAL ====================

const INITIAL_FORM: AutobusFormData = {
  codigo: '',
  matricula: '',
  numeroChasis: '',
  marca: '',
  modelo: '',
  carroceria: '',
  anio: new Date().getFullYear(),
  operadorId: '',
  estado: ESTADOS_AUTOBUS.OPERATIVO,
  telemetria: { tieneFms: false },
  carteleria: { tiene: false },
  instalacion: {
    fase: FASES_INSTALACION.PENDIENTE,
  },
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function NuevoAutobusPage() {
  const router = useRouter();
  
  // Estados
  const [formData, setFormData] = useState<AutobusFormData>(INITIAL_FORM);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOperadores, setLoadingOperadores] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [checkingMatricula, setCheckingMatricula] = useState(false);

  // Cargar operadores
  useEffect(() => {
    async function loadOperadores() {
      try {
        // En producción: cargar de Firebase
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

  // Validación de código único (debounced)
  useEffect(() => {
    if (!formData.codigo) {
      setErrors(prev => ({ ...prev, codigo: undefined }));
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCodigo(true);
      try {
        // En producción: verificarCodigoDisponible(formData.codigo)
        await new Promise(resolve => setTimeout(resolve, 200));
        // Simular que BUS-001 ya existe
        if (formData.codigo === 'BUS-001') {
          setErrors(prev => ({ ...prev, codigo: 'Este código ya está en uso' }));
        } else {
          setErrors(prev => ({ ...prev, codigo: undefined }));
        }
      } finally {
        setCheckingCodigo(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.codigo]);

  // Validación de matrícula única (debounced)
  useEffect(() => {
    if (!formData.matricula) {
      setErrors(prev => ({ ...prev, matricula: undefined }));
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingMatricula(true);
      try {
        // En producción: verificarMatriculaDisponible(formData.matricula)
        await new Promise(resolve => setTimeout(resolve, 200));
        setErrors(prev => ({ ...prev, matricula: undefined }));
      } finally {
        setCheckingMatricula(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.matricula]);

  // Handlers
  const handleChange = (field: keyof AutobusFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
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

    if (!validateForm()) return;
    if (errors.codigo || errors.matricula) return;

    setLoading(true);
    try {
      // En producción: createAutobus(formData)
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Creando autobús:', formData);
      router.push('/autobuses');
    } catch (error) {
      console.error('Error creating autobus:', error);
      setErrors({ general: 'Error al crear el autobús. Inténtelo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Object.values(errors).some(e => e !== undefined);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/autobuses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Autobús</h1>
          <p className="text-muted-foreground">
            Registrar un nuevo vehículo en la flota
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
                value={formData.numeroChasis}
                onChange={(e) => handleChange('numeroChasis', e.target.value.toUpperCase())}
                maxLength={17}
              />
              <p className="text-xs text-muted-foreground">
                17 caracteres alfanuméricos
              </p>
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
                  value={formData.marca}
                  onValueChange={(value) => handleChange('marca', value)}
                >
                  <SelectTrigger className={errors.marca ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARCAS_AUTOBUS.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  value={formData.carroceria}
                  onValueChange={(value) => handleChange('carroceria', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urbano">Urbano</SelectItem>
                    <SelectItem value="Interurbano">Interurbano</SelectItem>
                    <SelectItem value="Articulado">Articulado</SelectItem>
                    <SelectItem value="Microbús">Microbús</SelectItem>
                    <SelectItem value="Autocar">Autocar</SelectItem>
                  </SelectContent>
                </Select>
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
                onValueChange={(value) => handleChange('operadorId', value)}
                disabled={loadingOperadores}
              >
                <SelectTrigger className={errors.operadorId ? 'border-red-500' : ''}>
                  <SelectValue placeholder={loadingOperadores ? 'Cargando...' : 'Seleccionar operador'} />
                </SelectTrigger>
                <SelectContent>
                  {operadores.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Sistemas Previstos
            </CardTitle>
            <CardDescription>
              Indica qué sistemas se instalarán en el vehículo
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
                onCheckedChange={(checked) => handleChange('telemetria', { tieneFms: checked })}
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

        {/* Estado inicial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Estado Inicial
            </CardTitle>
            <CardDescription>
              Estado y fase de instalación al registrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado del Vehículo</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => handleChange('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ESTADOS_AUTOBUS.OPERATIVO}>
                      Operativo
                    </SelectItem>
                    <SelectItem value={ESTADOS_AUTOBUS.EN_TALLER}>
                      En Taller
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fase de Instalación</Label>
                <Select
                  value={formData.instalacion?.fase || FASES_INSTALACION.PENDIENTE}
                  onValueChange={(value) => handleChange('instalacion', { 
                    ...formData.instalacion, 
                    fase: value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FASES_INSTALACION.PENDIENTE}>
                      Pendiente
                    </SelectItem>
                    <SelectItem value={FASES_INSTALACION.PREINSTALACION}>
                      Pre-instalación
                    </SelectItem>
                    <SelectItem value={FASES_INSTALACION.COMPLETA}>
                      Completa
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/autobuses">Cancelar</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={loading || checkingCodigo || checkingMatricula || hasErrors}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Autobús
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
