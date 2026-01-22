'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TecnicoFormData, ESTADOS_TECNICO } from '@/types';
import { createTecnico } from '@/lib/firebase/tecnicos';
import { useTenantId, useAuth } from '@/contexts';
import { Button, Input, Select, Card, Badge } from '@/components/ui';
import { 
  ArrowLeft, 
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  Award,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Especialidades disponibles
const ESPECIALIDADES_OPTIONS = [
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'carroceria', label: 'Carrocería' },
  { value: 'neumaticos', label: 'Neumáticos' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'electronica', label: 'Electrónica' },
];

export default function NuevoTecnicoPage() {
  const router = useRouter();
  const tenantId = useTenantId();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [nombreCorto, setNombreCorto] = useState('');
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<string>(ESTADOS_TECNICO.ACTIVO);
  const [fechaAlta, setFechaAlta] = useState(new Date().toISOString().split('T')[0]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [certificaciones, setCertificaciones] = useState<string[]>([]);
  const [nuevaCertificacion, setNuevaCertificacion] = useState('');
  const [zonaPrincipalId, setZonaPrincipalId] = useState('');

  const validarFormulario = (): boolean => {
    const nuevosErrors: Record<string, string> = {};

    if (!nombre.trim()) {
      nuevosErrors.nombre = 'El nombre es obligatorio';
    }
    if (!apellidos.trim()) {
      nuevosErrors.apellidos = 'Los apellidos son obligatorios';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevosErrors.email = 'Email no válido';
    }
    if (especialidades.length === 0) {
      nuevosErrors.especialidades = 'Selecciona al menos una especialidad';
    }

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario() || !tenantId || !user) return;

    setLoading(true);
    try {
      // Note: contacto requiere nombre, pero para técnicos usamos el nombre del técnico
      const data: Partial<TecnicoFormData> = {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        nombreCorto: nombreCorto.trim() || undefined,
        codigoEmpleado: codigoEmpleado.trim() || undefined,
        contacto: telefono || email ? {
          nombre: `${nombre.trim()} ${apellidos.trim()}`,
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
        } : undefined,
        estado: estado as typeof ESTADOS_TECNICO[keyof typeof ESTADOS_TECNICO],
        especialidades,
        certificaciones: certificaciones.length > 0 ? certificaciones : undefined,
        zonaPrincipalId: zonaPrincipalId || undefined,
        zonasSecundariasIds: [],
      };

      await createTecnico(tenantId, data as TecnicoFormData, user.uid);
      router.push('/tecnicos');
    } catch (error) {
      console.error('Error creando técnico:', error);
      setErrors({ submit: 'Error al crear el técnico. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleEspecialidad = (esp: string) => {
    setEspecialidades(prev => 
      prev.includes(esp) 
        ? prev.filter(e => e !== esp)
        : [...prev, esp]
    );
  };

  const agregarCertificacion = () => {
    if (nuevaCertificacion.trim()) {
      setCertificaciones(prev => [...prev, nuevaCertificacion.trim()]);
      setNuevaCertificacion('');
    }
  };

  const eliminarCertificacion = (idx: number) => {
    setCertificaciones(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/tecnicos')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Técnico</h1>
          <p className="text-sm text-slate-400">
            Añade un nuevo miembro al equipo de mantenimiento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <User className="w-5 h-5" />
            Datos Personales
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nombre *
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Apellidos *
              </label>
              <Input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Apellidos"
                className={errors.apellidos ? 'border-red-500' : ''}
              />
              {errors.apellidos && (
                <p className="text-red-400 text-xs mt-1">{errors.apellidos}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nombre corto
              </label>
              <Input
                value={nombreCorto}
                onChange={(e) => setNombreCorto(e.target.value)}
                placeholder="Ej: Juanito"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Código empleado
              </label>
              <Input
                value={codigoEmpleado}
                onChange={(e) => setCodigoEmpleado(e.target.value)}
                placeholder="Ej: TEC-001"
              />
            </div>
          </div>
        </Card>

        {/* Contacto */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5" />
            Contacto
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Teléfono
              </label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tecnico@empresa.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Estado y fecha */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            Estado
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Estado *
              </label>
              <Select
                value={estado}
                onChange={setEstado}
                options={[
                  { value: ESTADOS_TECNICO.ACTIVO, label: 'Activo' },
                  { value: ESTADOS_TECNICO.VACACIONES, label: 'Vacaciones' },
                  { value: ESTADOS_TECNICO.BAJA_TEMPORAL, label: 'Baja temporal' },
                  { value: ESTADOS_TECNICO.BAJA_DEFINITIVA, label: 'Baja definitiva' },
                ]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Fecha de alta
              </label>
              <Input
                type="date"
                value={fechaAlta}
                onChange={(e) => setFechaAlta(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Especialidades */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5" />
            Especialidades *
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleEspecialidad(value)}
                className={cn(
                  'px-4 py-2 rounded-lg border text-sm transition-all',
                  especialidades.includes(value)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.especialidades && (
            <p className="text-red-400 text-xs mt-2">{errors.especialidades}</p>
          )}
        </Card>

        {/* Certificaciones */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" />
            Certificaciones
          </h2>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={nuevaCertificacion}
              onChange={(e) => setNuevaCertificacion(e.target.value)}
              placeholder="Añadir certificación..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarCertificacion();
                }
              }}
            />
            <Button 
              type="button" 
              variant="outline"
              onClick={agregarCertificacion}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {certificaciones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {certificaciones.map((cert, idx) => (
                <Badge 
                  key={idx} 
                  variant="default"
                  className="flex items-center gap-1 py-1.5"
                >
                  {cert}
                  <button 
                    type="button"
                    onClick={() => eliminarCertificacion(idx)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Error general */}
        {errors.submit && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/tecnicos')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Técnico
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
