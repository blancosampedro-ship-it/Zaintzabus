'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  ArrowLeft,
  Wifi,
  Smartphone,
  Shield,
  MapPin,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  FormField,
  LoadingSpinner,
  TextArea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { createEquipo, getTiposEquipo, verificarPosicionDisponible } from '@/lib/firebase/equipos';
import { TipoEquipo, ESTADOS_EQUIPO, PropiedadEquipo, UbicacionActualEquipo, FechasEquipo, GarantiaEquipo } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Mock data - reemplazar con datos reales
const mockOperadores = [
  { id: 'op1', nombre: 'Dbus', codigo: 'DBUS' },
  { id: 'op2', nombre: 'Lurraldebus', codigo: 'LDB' },
];

const mockAutobuses = [
  { id: 'bus1', codigo: 'BUS-001', operadorId: 'op1' },
  { id: 'bus2', codigo: 'BUS-002', operadorId: 'op1' },
  { id: 'bus3', codigo: 'BUS-010', operadorId: 'op2' },
];

const mockUbicaciones = [
  { id: 'alm1', nombre: 'Almacén Central Winfin', tipo: 'almacen_winfin' },
  { id: 'alm2', nombre: 'Almacén Dbus', tipo: 'almacen_operador', operadorId: 'op1' },
];

const POSICIONES_BUS = {
  CABINA_CONDUCTOR: 'Cabina del conductor',
  SALPICADERO: 'Salpicadero',
  TECHO_DELANTERO: 'Techo delantero',
  TECHO_CENTRAL: 'Techo central',
  TECHO_TRASERO: 'Techo trasero',
  LATERAL_IZQUIERDO: 'Lateral izquierdo',
  LATERAL_DERECHO: 'Lateral derecho',
  ZONA_PASAJEROS: 'Zona pasajeros',
  MALETERO: 'Maletero',
};

type UbicacionDestinoTipo = 'almacen' | 'autobus';

interface FormData {
  tipoEquipoId: string;
  operadorId: string;
  numeroSerieFabricante: string;
  marca: string;
  modelo: string;
  firmware: string;
  ip: string;
  mac: string;
  iccid: string;
  telefono: string;
  operadorSim: string;
  enGarantia: boolean;
  fechaFinGarantia: string;
  ubicacionTipo: UbicacionDestinoTipo;
  ubicacionId: string;
  posicionEnBus: string;
  observaciones: string;
}

const initialFormData: FormData = {
  tipoEquipoId: '',
  operadorId: '',
  numeroSerieFabricante: '',
  marca: '',
  modelo: '',
  firmware: '',
  ip: '',
  mac: '',
  iccid: '',
  telefono: '',
  operadorSim: '',
  enGarantia: true,
  fechaFinGarantia: '',
  ubicacionTipo: 'almacen',
  ubicacionId: '',
  posicionEnBus: '',
  observaciones: '',
};

export default function NuevoEquipoPage() {
  const router = useRouter();
  const { ToastContainer, success, error: showError } = useToast();

  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [tiposEquipo, setTiposEquipo] = React.useState<TipoEquipo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});

  React.useEffect(() => {
    async function loadData() {
      try {
        const tipos = await getTiposEquipo();
        setTiposEquipo(tipos);
      } catch (err) {
        console.error('Error loading tipos equipo:', err);
        showError('Error al cargar tipos de equipo');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const ubicacionOptions = React.useMemo(() => {
    if (formData.ubicacionTipo === 'autobus') {
      const buses = formData.operadorId
        ? mockAutobuses.filter((b) => b.operadorId === formData.operadorId)
        : mockAutobuses;
      return buses.map((b) => ({ value: b.id, label: b.codigo }));
    }
    return mockUbicaciones.map((u) => ({ value: u.id, label: u.nombre }));
  }, [formData.ubicacionTipo, formData.operadorId]);

  const tipoOptions = tiposEquipo.map((t) => ({ value: t.id, label: t.nombre }));
  const operadorOptions = mockOperadores.map((o) => ({ value: o.id, label: o.nombre }));
  const posicionOptions = Object.entries(POSICIONES_BUS).map(([key, label]) => ({
    value: key,
    label,
  }));

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.tipoEquipoId) newErrors.tipoEquipoId = 'Requerido';
    if (!formData.operadorId) newErrors.operadorId = 'Requerido';
    if (!formData.ubicacionId) newErrors.ubicacionId = 'Requerido';
    if (formData.ubicacionTipo === 'autobus' && !formData.posicionEnBus) {
      newErrors.posicionEnBus = 'Requerido para autobús';
    }

    // Validar formato IP si se proporciona
    if (formData.ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.ip)) {
      newErrors.ip = 'Formato IP inválido';
    }

    // Validar formato MAC si se proporciona
    if (formData.mac && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.mac)) {
      newErrors.mac = 'Formato MAC inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Validar posición si es autobús
      if (formData.ubicacionTipo === 'autobus' && formData.posicionEnBus) {
        const posicionDisponible = await verificarPosicionDisponible(
          formData.ubicacionId,
          formData.posicionEnBus
        );
        if (!posicionDisponible) {
          setErrors({ posicionEnBus: 'Posición ocupada' });
          setSaving(false);
          return;
        }
      }

      const tipo = tiposEquipo.find((t) => t.id === formData.tipoEquipoId);

      // Construir ubicación actual
      let ubicacionActual: UbicacionActualEquipo;
      if (formData.ubicacionTipo === 'autobus') {
        const autobus = mockAutobuses.find((b) => b.id === formData.ubicacionId);
        ubicacionActual = {
          tipo: 'autobus',
          id: formData.ubicacionId,
          nombre: autobus?.codigo || '',
          posicionEnBus: formData.posicionEnBus || undefined,
        };
      } else {
        const almacen = mockUbicaciones.find((u) => u.id === formData.ubicacionId);
        ubicacionActual = {
          tipo: 'ubicacion',
          id: formData.ubicacionId,
          nombre: almacen?.nombre || '',
        };
      }

      // Construir propiedad
      const propiedad: PropiedadEquipo = {
        propietario: 'DFG',
        operadorAsignadoId: formData.operadorId || undefined,
      };

      // Construir fechas
      const fechas: FechasEquipo = {
        alta: Timestamp.now(),
        instalacionActual: formData.ubicacionTipo === 'autobus' ? Timestamp.now() : undefined,
      };

      // Construir garantía
      const garantia: GarantiaEquipo | undefined = formData.enGarantia
        ? {
            enGarantia: true,
            fechaFin: formData.fechaFinGarantia
              ? Timestamp.fromDate(new Date(formData.fechaFinGarantia))
              : undefined,
          }
        : { enGarantia: false };

      // Construir datos del equipo
      const equipoData = {
        tipoEquipoId: formData.tipoEquipoId,
        tipoEquipoNombre: tipo?.nombre,
        numeroSerieFabricante: formData.numeroSerieFabricante || undefined,
        caracteristicas: {
          marca: formData.marca || undefined,
          modelo: formData.modelo || undefined,
          firmware: formData.firmware || undefined,
        },
        red:
          formData.ip || formData.mac
            ? { ip: formData.ip || undefined, mac: formData.mac || undefined }
            : undefined,
        sim:
          formData.iccid || formData.telefono
            ? {
                iccid: formData.iccid || undefined,
                telefono: formData.telefono || undefined,
                operador: formData.operadorSim || undefined,
              }
            : undefined,
        propiedad,
        ubicacionActual,
        estado:
          formData.ubicacionTipo === 'autobus'
            ? ESTADOS_EQUIPO.EN_SERVICIO
            : ESTADOS_EQUIPO.EN_ALMACEN,
        fechas,
        garantia,
      };

      const tipoEquipoCodigo = tipo?.codigo || 'EQ';
      const nuevoEquipoId = await createEquipo(equipoData, tipoEquipoCodigo);
      success('Equipo creado correctamente');
      router.push(`/equipos/${nuevoEquipoId}`);
    } catch (err) {
      console.error('Error creating equipo:', err);
      showError('Error al crear el equipo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer />

      <Breadcrumbs
        items={[
          { label: 'Equipos', href: '/equipos' },
          { label: 'Nuevo equipo' },
        ]}
        showHome
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Equipo</h1>
          <p className="text-slate-400">Registra un nuevo equipo embarcado</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Cpu className="h-5 w-5 inline mr-2 text-cyan-400" />
                Datos Básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Tipo de equipo" required error={errors.tipoEquipoId}>
                <Select
                  options={tipoOptions}
                  value={formData.tipoEquipoId}
                  onChange={(v) => handleChange('tipoEquipoId', v)}
                  placeholder="Selecciona..."
                  error={!!errors.tipoEquipoId}
                />
              </FormField>

              <FormField label="Operador asignado" required error={errors.operadorId}>
                <Select
                  options={operadorOptions}
                  value={formData.operadorId}
                  onChange={(v) => handleChange('operadorId', v)}
                  placeholder="Selecciona..."
                  error={!!errors.operadorId}
                />
              </FormField>

              <FormField label="Nº serie fabricante" hint="Código interno generado automáticamente">
                <Input
                  value={formData.numeroSerieFabricante}
                  onChange={(e) => handleChange('numeroSerieFabricante', e.target.value)}
                  placeholder="Ej: SN123456789"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Características Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Cpu className="h-5 w-5 inline mr-2 text-cyan-400" />
                Características Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Marca">
                <Input
                  value={formData.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  placeholder="Ej: Teltonika"
                />
              </FormField>

              <FormField label="Modelo">
                <Input
                  value={formData.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  placeholder="Ej: FMB920"
                />
              </FormField>

              <FormField label="Versión firmware">
                <Input
                  value={formData.firmware}
                  onChange={(e) => handleChange('firmware', e.target.value)}
                  placeholder="Ej: v3.25.1"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Conectividad */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Wifi className="h-5 w-5 inline mr-2 text-cyan-400" />
                Conectividad
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Dirección IP" error={errors.ip}>
                <Input
                  value={formData.ip}
                  onChange={(e) => handleChange('ip', e.target.value)}
                  placeholder="Ej: 192.168.1.100"
                  variant={errors.ip ? 'error' : 'default'}
                />
              </FormField>

              <FormField label="Dirección MAC" error={errors.mac}>
                <Input
                  value={formData.mac}
                  onChange={(e) => handleChange('mac', e.target.value)}
                  placeholder="Ej: 00:1B:44:11:3A:B7"
                  variant={errors.mac ? 'error' : 'default'}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* SIM / Telefonía */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Smartphone className="h-5 w-5 inline mr-2 text-cyan-400" />
                SIM / Telefonía
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="ICCID">
                <Input
                  value={formData.iccid}
                  onChange={(e) => handleChange('iccid', e.target.value)}
                  placeholder="Ej: 8934071..."
                />
              </FormField>

              <FormField label="Número de teléfono">
                <Input
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="Ej: +34 600 000 000"
                />
              </FormField>

              <FormField label="Operador telefonía">
                <Input
                  value={formData.operadorSim}
                  onChange={(e) => handleChange('operadorSim', e.target.value)}
                  placeholder="Ej: Vodafone, Orange..."
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Garantía */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Shield className="h-5 w-5 inline mr-2 text-cyan-400" />
                Garantía
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="¿En garantía?">
                <Select
                  options={[
                    { value: 'true', label: 'Sí' },
                    { value: 'false', label: 'No' },
                  ]}
                  value={formData.enGarantia ? 'true' : 'false'}
                  onChange={(v) => handleChange('enGarantia', v === 'true')}
                />
              </FormField>

              {formData.enGarantia && (
                <FormField label="Fecha fin de garantía">
                  <Input
                    type="date"
                    value={formData.fechaFinGarantia}
                    onChange={(e) => handleChange('fechaFinGarantia', e.target.value)}
                  />
                </FormField>
              )}
            </CardContent>
          </Card>

          {/* Ubicación Inicial */}
          <Card>
            <CardHeader>
              <CardTitle>
                <MapPin className="h-5 w-5 inline mr-2 text-cyan-400" />
                Ubicación Inicial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Tipo de ubicación" required>
                  <Select
                    options={[
                      { value: 'almacen', label: 'Almacén' },
                      { value: 'autobus', label: 'Autobús' },
                    ]}
                    value={formData.ubicacionTipo}
                    onChange={(v) => {
                      handleChange('ubicacionTipo', v as UbicacionDestinoTipo);
                      handleChange('ubicacionId', '');
                      handleChange('posicionEnBus', '');
                    }}
                  />
                </FormField>

                <FormField label="Destino" required error={errors.ubicacionId}>
                  <Select
                    options={ubicacionOptions}
                    value={formData.ubicacionId}
                    onChange={(v) => handleChange('ubicacionId', v)}
                    placeholder="Selecciona..."
                    error={!!errors.ubicacionId}
                  />
                </FormField>
              </div>

              {formData.ubicacionTipo === 'autobus' && (
                <FormField label="Posición en autobús" required error={errors.posicionEnBus}>
                  <Select
                    options={posicionOptions}
                    value={formData.posicionEnBus}
                    onChange={(v) => handleChange('posicionEnBus', v)}
                    placeholder="Selecciona posición..."
                    error={!!errors.posicionEnBus}
                  />
                </FormField>
              )}

              <FormField label="Observaciones">
                <TextArea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  placeholder="Notas adicionales sobre el equipo..."
                  rows={3}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Guardando...
                </>
              ) : (
                'Crear Equipo'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
