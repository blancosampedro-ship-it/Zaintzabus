'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  FormField,
  FormActions,
} from '@/components/ui';
import {
  getOperadores,
  crearOperador,
  actualizarOperador,
  desactivarOperador,
} from '@/lib/firebase/contratos';
import { useAuth } from '@/contexts/AuthContext';
import type { Operador } from '@/types';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminOperadoresPage() {
  const { user, claims } = useAuth();

  // Estados
  const [loading, setLoading] = useState(true);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [busqueda, setBusqueda] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Operador | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    razonSocial: '',
    cif: '',
    direccionCalle: '',
    direccionCiudad: '',
    direccionCP: '',
    direccionProvincia: '',
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
  });

  // Confirmar desactivar
  const [operadorDesactivar, setOperadorDesactivar] = useState<Operador | null>(null);
  const [desactivando, setDesactivando] = useState(false);

  useEffect(() => {
    cargarOperadores();
  }, []);

  const cargarOperadores = async () => {
    setLoading(true);
    try {
      const data = await getOperadores();
      setOperadores(data);
    } catch (error) {
      console.error('Error cargando operadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (operador?: Operador) => {
    if (operador) {
      setEditando(operador);
      setFormData({
        codigo: String(operador.codigoNumerico || ''),
        nombre: operador.nombre,
        razonSocial: '',
        cif: '',
        direccionCalle: operador.direccionCochera?.linea1 || '',
        direccionCiudad: operador.direccionCochera?.municipio || '',
        direccionCP: operador.direccionCochera?.codigoPostal || '',
        direccionProvincia: operador.direccionCochera?.provincia || '',
        contactoNombre: operador.contacto?.nombre || '',
        contactoEmail: operador.contacto?.email || '',
        contactoTelefono: operador.contacto?.telefono || '',
      });
    } else {
      setEditando(null);
      setFormData({
        codigo: '',
        nombre: '',
        razonSocial: '',
        cif: '',
        direccionCalle: '',
        direccionCiudad: '',
        direccionCP: '',
        direccionProvincia: '',
        contactoNombre: '',
        contactoEmail: '',
        contactoTelefono: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setGuardando(true);
    try {
      // Crear objeto compatible con el tipo Operador
      const operadorData = {
        codigo: formData.codigo,
        codigoNumerico: parseInt(formData.codigo) || 0,
        nombre: formData.nombre,
        razonSocial: formData.razonSocial || formData.nombre,
        cif: formData.cif || '',
        direccion: {
          calle: formData.direccionCalle,
          ciudad: formData.direccionCiudad,
          codigoPostal: formData.direccionCP,
          provincia: formData.direccionProvincia,
        },
        direccionCochera: {
          linea1: formData.direccionCalle,
          municipio: formData.direccionCiudad,
          codigoPostal: formData.direccionCP,
          provincia: formData.direccionProvincia,
        },
        contacto: {
          nombre: formData.contactoNombre,
          email: formData.contactoEmail,
          telefono: formData.contactoTelefono,
        },
        tieneAlmacenPropio: false,
        activo: true,
      };

      if (editando) {
        await actualizarOperador(editando.id, operadorData, user.uid);
      } else {
        await crearOperador(operadorData, user.uid);
      }

      setShowModal(false);
      cargarOperadores();
    } catch (error) {
      console.error('Error guardando operador:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async () => {
    if (!operadorDesactivar || !user) return;

    setDesactivando(true);
    try {
      await desactivarOperador(operadorDesactivar.id, user.uid);
      setOperadorDesactivar(null);
      cargarOperadores();
    } catch (error) {
      console.error('Error desactivando operador:', error);
    } finally {
      setDesactivando(false);
    }
  };

  // Filtrar operadores
  const operadoresFiltrados = operadores.filter((op) => {
    if (!busqueda) return true;
    const search = busqueda.toLowerCase();
    return (
      op.nombre.toLowerCase().includes(search) ||
      op.codigo.toLowerCase().includes(search) ||
      op.cif.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Gestión de Operadores</h1>
          <p className="text-slate-400 mt-1">
            Administra los operadores de transporte del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={cargarOperadores}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => abrirModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Operador
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, código o CIF..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de operadores */}
      {operadoresFiltrados.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No hay operadores"
          description={
            busqueda
              ? 'No se encontraron operadores con ese criterio'
              : 'Añade tu primer operador para comenzar'
          }
          action={
            !busqueda ? (
              <Button onClick={() => abrirModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Operador
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {operadoresFiltrados.map((operador) => (
            <Card
              key={operador.id}
              className={`hover:border-slate-600 transition-colors ${
                !operador.activo ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-slate-700/50">
                      <Building2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100">{operador.nombre}</h3>
                        <Badge variant="outline">{operador.codigo || operador.id}</Badge>
                        {operador.activo ? (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>{operador.cif || operador.id}</span>
                        {(operador.direccion?.ciudad || operador.direccionCochera?.municipio) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {operador.direccion?.ciudad || operador.direccionCochera?.municipio}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      {operador.contacto?.email && (
                        <p className="flex items-center gap-1 text-slate-400">
                          <Mail className="h-3 w-3" />
                          {operador.contacto.email}
                        </p>
                      )}
                      {operador.contacto?.telefono && (
                        <p className="flex items-center gap-1 text-slate-400">
                          <Phone className="h-3 w-3" />
                          {operador.contacto.telefono}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModal(operador)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {operador.activo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOperadorDesactivar(operador)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? 'Editar Operador' : 'Nuevo Operador'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Código" required>
              <Input
                value={formData.codigo}
                onChange={(e) =>
                  setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                }
                placeholder="EJ: BIZ"
                maxLength={10}
              />
            </FormField>

            <FormField label="CIF" required>
              <Input
                value={formData.cif}
                onChange={(e) =>
                  setFormData({ ...formData, cif: e.target.value.toUpperCase() })
                }
                placeholder="B12345678"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre Comercial" required>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del operador"
              />
            </FormField>

            <FormField label="Razón Social" required>
              <Input
                value={formData.razonSocial}
                onChange={(e) =>
                  setFormData({ ...formData, razonSocial: e.target.value })
                }
                placeholder="Razón social completa"
              />
            </FormField>
          </div>

          {/* Dirección */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Dirección Fiscal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Calle" className="md:col-span-2">
                <Input
                  value={formData.direccionCalle}
                  onChange={(e) =>
                    setFormData({ ...formData, direccionCalle: e.target.value })
                  }
                  placeholder="Calle, número, piso..."
                />
              </FormField>

              <FormField label="Ciudad">
                <Input
                  value={formData.direccionCiudad}
                  onChange={(e) =>
                    setFormData({ ...formData, direccionCiudad: e.target.value })
                  }
                  placeholder="Ciudad"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="C.P.">
                  <Input
                    value={formData.direccionCP}
                    onChange={(e) =>
                      setFormData({ ...formData, direccionCP: e.target.value })
                    }
                    placeholder="48001"
                  />
                </FormField>

                <FormField label="Provincia">
                  <Input
                    value={formData.direccionProvincia}
                    onChange={(e) =>
                      setFormData({ ...formData, direccionProvincia: e.target.value })
                    }
                    placeholder="Bizkaia"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Contacto Principal</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Nombre">
                <Input
                  value={formData.contactoNombre}
                  onChange={(e) =>
                    setFormData({ ...formData, contactoNombre: e.target.value })
                  }
                  placeholder="Nombre del contacto"
                />
              </FormField>

              <FormField label="Email">
                <Input
                  type="email"
                  value={formData.contactoEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactoEmail: e.target.value })
                  }
                  placeholder="email@operador.com"
                />
              </FormField>

              <FormField label="Teléfono">
                <Input
                  value={formData.contactoTelefono}
                  onChange={(e) =>
                    setFormData({ ...formData, contactoTelefono: e.target.value })
                  }
                  placeholder="944 000 000"
                />
              </FormField>
            </div>
          </div>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!formData.codigo || !formData.nombre || guardando}
            >
              {guardando ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              {editando ? 'Guardar Cambios' : 'Crear Operador'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Confirmar desactivar */}
      <ConfirmDialog
        isOpen={!!operadorDesactivar}
        onClose={() => setOperadorDesactivar(null)}
        onConfirm={handleDesactivar}
        title="Desactivar Operador"
        message={`¿Estás seguro de que deseas desactivar el operador "${operadorDesactivar?.nombre}"? El operador y sus contratos quedarán inactivos.`}
        confirmText="Desactivar"
        variant="danger"
      />
    </div>
  );
}
