'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowRightLeft,
  Bus,
  Warehouse,
  Wrench,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import {
  Modal,
  ModalFooter,
  Button,
  Input,
  Select,
  TextArea,
  FormField,
  type SelectOption,
  Alert,
} from '@/components/ui';
import {
  Equipo,
  TipoMovimientoEquipo,
  TIPOS_MOVIMIENTO_EQUIPO,
  Autobus,
  Ubicacion,
  Laboratorio,
} from '@/types';

export interface MoverEquipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
  autobuses: Array<{ id: string; codigo: string; operadorNombre?: string }>;
  ubicaciones: Array<{ id: string; nombre: string; tipo: string }>;
  laboratorios: Array<{ id: string; nombre: string }>;
  onSubmit: (data: MoverEquipoFormData) => Promise<void>;
}

export interface MoverEquipoFormData {
  destinoTipo: 'autobus' | 'ubicacion' | 'laboratorio';
  destinoId: string;
  posicionEnBus?: string;
  tipoMovimiento: TipoMovimientoEquipo;
  motivo: string;
  comentarios?: string;
}

const tipoDestinoOptions: SelectOption[] = [
  { value: 'autobus', label: 'Autobús' },
  { value: 'ubicacion', label: 'Almacén' },
  { value: 'laboratorio', label: 'Laboratorio' },
];

const tipoMovimientoOptions: SelectOption[] = [
  { value: TIPOS_MOVIMIENTO_EQUIPO.INSTALACION, label: 'Instalación' },
  { value: TIPOS_MOVIMIENTO_EQUIPO.SUSTITUCION, label: 'Sustitución' },
  { value: TIPOS_MOVIMIENTO_EQUIPO.RETIRADA_AVERIA, label: 'Retirada por avería' },
  { value: TIPOS_MOVIMIENTO_EQUIPO.RETORNO_LABORATORIO, label: 'Retorno de laboratorio' },
  { value: TIPOS_MOVIMIENTO_EQUIPO.REUBICACION, label: 'Reubicación' },
];

const posicionesAutobus: SelectOption[] = [
  { value: 'VALIDADORA_1', label: 'Validadora 1 (Entrada)' },
  { value: 'VALIDADORA_2', label: 'Validadora 2 (Salida)' },
  { value: 'VALIDADORA_3', label: 'Validadora 3 (Central)' },
  { value: 'SAE', label: 'SAE (Puesto conductor)' },
  { value: 'ROUTER', label: 'Router 4G/5G' },
  { value: 'CAMARA_1', label: 'Cámara 1 (Frontal)' },
  { value: 'CAMARA_2', label: 'Cámara 2 (Interior)' },
  { value: 'CAMARA_3', label: 'Cámara 3 (Trasera)' },
  { value: 'CAMARA_4', label: 'Cámara 4 (Puerta)' },
  { value: 'PANTALLA_INT', label: 'Pantalla Interior' },
  { value: 'PANTALLA_EXT', label: 'Pantalla Exterior' },
  { value: 'GRABADOR', label: 'Grabador DVR/NVR' },
  { value: 'CONTADOR_1', label: 'Contador pasajeros 1' },
  { value: 'CONTADOR_2', label: 'Contador pasajeros 2' },
  { value: 'OTRO', label: 'Otra posición' },
];

export function MoverEquipoModal({
  isOpen,
  onClose,
  equipo,
  autobuses,
  ubicaciones,
  laboratorios,
  onSubmit,
}: MoverEquipoModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<MoverEquipoFormData>({
    destinoTipo: 'autobus',
    destinoId: '',
    posicionEnBus: '',
    tipoMovimiento: TIPOS_MOVIMIENTO_EQUIPO.INSTALACION as TipoMovimientoEquipo,
    motivo: '',
    comentarios: '',
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen && equipo) {
      // Pre-seleccionar tipo de movimiento según estado actual
      let tipoDefault: TipoMovimientoEquipo = TIPOS_MOVIMIENTO_EQUIPO.INSTALACION;
      if (equipo.ubicacionActual.tipo === 'autobus') {
        tipoDefault = TIPOS_MOVIMIENTO_EQUIPO.RETIRADA_AVERIA;
      } else if (equipo.ubicacionActual.tipo === 'laboratorio') {
        tipoDefault = TIPOS_MOVIMIENTO_EQUIPO.RETORNO_LABORATORIO;
      }

      setFormData({
        destinoTipo: 'autobus',
        destinoId: '',
        posicionEnBus: '',
        tipoMovimiento: tipoDefault,
        motivo: '',
        comentarios: '',
      });
      setError(null);
    }
  }, [isOpen, equipo]);

  const autobusOptions: SelectOption[] = autobuses.map((a) => ({
    value: a.id,
    label: `${a.codigo}${a.operadorNombre ? ` (${a.operadorNombre})` : ''}`,
  }));

  const ubicacionOptions: SelectOption[] = ubicaciones.map((u) => ({
    value: u.id,
    label: `${u.nombre} (${u.tipo})`,
  }));

  const laboratorioOptions: SelectOption[] = laboratorios.map((l) => ({
    value: l.id,
    label: l.nombre,
  }));

  const getDestinoOptions = (): SelectOption[] => {
    switch (formData.destinoTipo) {
      case 'autobus':
        return autobusOptions;
      case 'ubicacion':
        return ubicacionOptions;
      case 'laboratorio':
        return laboratorioOptions;
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.destinoId) {
      setError('Selecciona un destino');
      return;
    }

    if (!formData.motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    if (formData.destinoTipo === 'autobus' && !formData.posicionEnBus) {
      setError('Selecciona la posición en el autobús');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al mover el equipo');
    } finally {
      setLoading(false);
    }
  };

  if (!equipo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mover Equipo"
      description={`Mover ${equipo.codigoInterno} desde ${equipo.ubicacionActual.nombre}`}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Origen actual */}
        <div className="p-3 bg-slate-700/30 rounded-lg mb-4">
          <p className="text-xs text-slate-500 mb-1">Ubicación actual</p>
          <div className="flex items-center gap-2 text-white">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{equipo.ubicacionActual.nombre}</span>
            {equipo.ubicacionActual.posicionEnBus && (
              <span className="text-sm text-slate-400">
                ({equipo.ubicacionActual.posicionEnBus})
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Tipo de movimiento */}
          <FormField label="Tipo de movimiento" required>
            <Select
              options={tipoMovimientoOptions}
              value={formData.tipoMovimiento}
              onChange={(v) =>
                setFormData({ ...formData, tipoMovimiento: v as TipoMovimientoEquipo })
              }
            />
          </FormField>

          {/* Tipo de destino */}
          <FormField label="Tipo de destino" required>
            <Select
              options={tipoDestinoOptions}
              value={formData.destinoTipo}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  destinoTipo: v as 'autobus' | 'ubicacion' | 'laboratorio',
                  destinoId: '',
                  posicionEnBus: '',
                })
              }
            />
          </FormField>

          {/* Destino específico */}
          <FormField
            label={
              formData.destinoTipo === 'autobus'
                ? 'Autobús'
                : formData.destinoTipo === 'ubicacion'
                ? 'Almacén'
                : 'Laboratorio'
            }
            required
          >
            <Select
              options={getDestinoOptions()}
              value={formData.destinoId}
              onChange={(v) => setFormData({ ...formData, destinoId: v as string })}
              placeholder="Seleccionar destino..."
            />
          </FormField>

          {/* Posición en bus */}
          {formData.destinoTipo === 'autobus' && (
            <FormField label="Posición en el autobús" required>
              <Select
                options={posicionesAutobus}
                value={formData.posicionEnBus || ''}
                onChange={(v) =>
                  setFormData({ ...formData, posicionEnBus: v as string })
                }
                placeholder="Seleccionar posición..."
              />
            </FormField>
          )}

          {/* Motivo */}
          <FormField label="Motivo" required>
            <TextArea
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              placeholder="Describe el motivo del movimiento..."
              rows={2}
            />
          </FormField>

          {/* Comentarios */}
          <FormField label="Comentarios adicionales">
            <TextArea
              value={formData.comentarios || ''}
              onChange={(e) =>
                setFormData({ ...formData, comentarios: e.target.value })
              }
              placeholder="Observaciones opcionales..."
              rows={2}
            />
          </FormField>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Mover Equipo
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
