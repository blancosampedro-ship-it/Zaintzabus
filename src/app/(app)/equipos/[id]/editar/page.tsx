'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Cpu,
  ArrowLeft,
  Wifi,
  Smartphone,
  Shield,
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
  TextArea,
  LoadingPage,
  NotFoundState,
  LoadingSpinner,
  Badge,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { getEquipoById, updateEquipo, getTiposEquipo } from '@/lib/firebase/equipos';
import { Equipo, TipoEquipo, PropiedadEquipo, GarantiaEquipo } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Mock data - reemplazar con datos reales
const mockOperadores = [
  { id: 'op1', nombre: 'Dbus', codigo: 'DBUS' },
  { id: 'op2', nombre: 'Lurraldebus', codigo: 'LDB' },
];

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
  observaciones: string;
}

export default function EditarEquipoPage() {
  const params = useParams();
  const router = useRouter();
  const equipoId = params.id as string;
  const { success, error: showError, ToastContainer } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [equipo, setEquipo] = React.useState<Equipo | null>(null);
  const [tiposEquipo, setTiposEquipo] = React.useState<TipoEquipo[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
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
    observaciones: '',
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});

  React.useEffect(() => {
    loadData();
  }, [equipoId]);

  const loadData = async () => {
    try {
      const [equipoData, tipos] = await Promise.all([
        getEquipoById(equipoId),
        getTiposEquipo(),
      ]);

      setEquipo(equipoData);
      setTiposEquipo(tipos);

      if (equipoData) {
        setFormData({
          tipoEquipoId: equipoData.tipoEquipoId,
          operadorId: equipoData.propiedad?.operadorAsignadoId || '',
          numeroSerieFabricante: equipoData.numeroSerieFabricante || '',
          marca: equipoData.caracteristicas?.marca || '',
          modelo: equipoData.caracteristicas?.modelo || '',
          firmware: equipoData.caracteristicas?.firmware || '',
          ip: equipoData.red?.ip || '',
          mac: equipoData.red?.mac || '',
          iccid: equipoData.sim?.iccid || '',
          telefono: equipoData.sim?.telefono || '',
          operadorSim: equipoData.sim?.operador || '',
          enGarantia: equipoData.garantia?.enGarantia ?? true,
          fechaFinGarantia: equipoData.garantia?.fechaFin
            ? new Date((equipoData.garantia.fechaFin as unknown as { seconds: number }).seconds * 1000)
                .toISOString()
                .split('T')[0]
            : '',
          observaciones: '',
        });
      }
    } catch (err) {
      console.error('Error loading equipo:', err);
      showError('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const tipoOptions = tiposEquipo.map((t) => ({ value: t.id, label: t.nombre }));
  const operadorOptions = mockOperadores.map((o) => ({ value: o.id, label: o.nombre }));

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.tipoEquipoId) newErrors.tipoEquipoId = 'Requerido';
    if (!formData.operadorId) newErrors.operadorId = 'Requerido';

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
    if (!equipo || !validateForm()) return;

    setSaving(true);
    try {
      const tipo = tiposEquipo.find((t) => t.id === formData.tipoEquipoId);

      // Construir propiedad actualizada
      const propiedad: PropiedadEquipo = {
        propietario: 'DFG',
        operadorAsignadoId: formData.operadorId || undefined,
      };

      // Construir garantía actualizada
      const garantia: GarantiaEquipo = {
        enGarantia: formData.enGarantia,
        fechaFin: formData.fechaFinGarantia && formData.enGarantia
          ? Timestamp.fromDate(new Date(formData.fechaFinGarantia))
          : undefined,
      };

      const updateData: Partial<Equipo> = {
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
        garantia,
      };

      await updateEquipo(equipo.id, updateData);
      success('Equipo actualizado correctamente');
      router.push(`/equipos/${equipoId}`);
    } catch (err) {
      console.error('Error updating equipo:', err);
      showError('Error al actualizar el equipo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!equipo) {
    return (
      <NotFoundState
        entityName="Equipo"
        onGoBack={() => router.push('/equipos')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      <Breadcrumbs
        items={[
          { label: 'Equipos', href: '/equipos' },
          { label: equipo.codigoInterno, href: `/equipos/${equipoId}` },
          { label: 'Editar' },
        ]}
        showHome
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">
              Editar {equipo.codigoInterno}
            </h1>
            <Badge variant="info">{equipo.tipoEquipoNombre}</Badge>
          </div>
          <p className="text-slate-400">Modifica los datos del equipo</p>
        </div>
      </div>

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

            <FormField label="Nº serie fabricante">
              <Input
                value={formData.numeroSerieFabricante}
                onChange={(e) => handleChange('numeroSerieFabricante', e.target.value)}
                placeholder="Ej: SN123456789"
              />
            </FormField>

            <FormField label="Código interno" hint="Generado automáticamente">
              <Input value={equipo.codigoInterno} disabled />
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

        {/* Observaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <TextArea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre el equipo..."
              rows={3}
            />
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
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
