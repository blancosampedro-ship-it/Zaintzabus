'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  DataTable,
} from '@/components/ui';
import {
  getContratos,
  getOperadoresActivos,
  eliminarContrato,
  getResumenContratos,
  contratoVigente,
  diasRestantesContrato,
} from '@/lib/firebase/contratos';
import { useAuth } from '@/contexts/AuthContext';
import type { Contrato, Operador } from '@/types';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function ContratosPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [resumen, setResumen] = useState<{
    total: number;
    vigentes: number;
    porVencer: number;
    vencidos: number;
  } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroOperador, setFiltroOperador] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Modal eliminar
  const [contratoAEliminar, setContratoAEliminar] = useState<Contrato | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (tenantId) {
      cargarDatos();
    }
  }, [tenantId]);

  const cargarDatos = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [contratosData, operadoresData, resumenData] = await Promise.all([
        getContratos(tenantId),
        getOperadoresActivos(),
        getResumenContratos(tenantId),
      ]);
      setContratos(contratosData);
      setOperadores(operadoresData);
      setResumen(resumenData);
    } catch (error) {
      console.error('Error cargando contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!contratoAEliminar || !tenantId) return;
    setEliminando(true);
    try {
      await eliminarContrato(tenantId, contratoAEliminar.id);
      setContratos((prev) => prev.filter((c) => c.id !== contratoAEliminar.id));
      setContratoAEliminar(null);
    } catch (error) {
      console.error('Error eliminando contrato:', error);
    } finally {
      setEliminando(false);
    }
  };

  // Filtrar contratos
  const contratosFiltrados = contratos.filter((contrato) => {
    // Búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      const operador = operadores.find((o) => o.id === contrato.operadorId);
      if (
        !contrato.codigo.toLowerCase().includes(searchLower) &&
        !operador?.nombre.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Filtro operador
    if (filtroOperador !== 'todos' && contrato.operadorId !== filtroOperador) {
      return false;
    }

    // Filtro estado
    if (filtroEstado !== 'todos') {
      const vigente = contratoVigente(contrato);
      const dias = diasRestantesContrato(contrato);
      
      if (filtroEstado === 'vigente' && !vigente) return false;
      if (filtroEstado === 'por_vencer' && (dias === null || dias > 30 || dias < 0)) return false;
      if (filtroEstado === 'vencido' && vigente) return false;
    }

    return true;
  });

  const getEstadoContrato = (contrato: Contrato) => {
    const vigente = contratoVigente(contrato);
    const dias = diasRestantesContrato(contrato);

    if (!vigente) {
      return { label: 'Vencido', color: 'red', icon: XCircle };
    }
    if (dias !== null && dias <= 30) {
      return { label: `Vence en ${dias} días`, color: 'yellow', icon: AlertTriangle };
    }
    return { label: 'Vigente', color: 'green', icon: CheckCircle2 };
  };

  const getTipoContratoLabel = (tipo: string) => {
    switch (tipo) {
      case 'fijo':
        return 'Cuota Fija';
      case 'variable':
        return 'Por Intervención';
      case 'mixto':
        return 'Mixto';
      default:
        return tipo;
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-100">Gestión de Contratos</h1>
          <p className="text-slate-400 mt-1">
            Administra los contratos con operadores de transporte
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={cargarDatos}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Link href="/contratos/nuevo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Contratos</p>
                  <p className="text-2xl font-bold text-slate-100">{resumen.total}</p>
                </div>
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Vigentes</p>
                  <p className="text-2xl font-bold text-green-300">{resumen.vigentes}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-900/20 border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Por Vencer (30d)</p>
                  <p className="text-2xl font-bold text-yellow-300">{resumen.porVencer}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-400">Vencidos</p>
                  <p className="text-2xl font-bold text-red-300">{resumen.vencidos}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por código o operador..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filtroOperador}
              onChange={setFiltroOperador}
              options={[
                { value: 'todos', label: 'Todos los operadores' },
                ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
              ]}
              className="w-full md:w-[200px]"
            />
            <Select
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'vigente', label: 'Vigentes' },
                { value: 'por_vencer', label: 'Por vencer' },
                { value: 'vencido', label: 'Vencidos' },
              ]}
              className="w-full md:w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de contratos */}
      {contratosFiltrados.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No hay contratos"
          description={
            busqueda || filtroOperador !== 'todos' || filtroEstado !== 'todos'
              ? 'No se encontraron contratos con los filtros aplicados'
              : 'Crea tu primer contrato para comenzar'
          }
          action={
            !busqueda && filtroOperador === 'todos' && filtroEstado === 'todos' ? (
              <Link href="/contratos/nuevo">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Contrato
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {contratosFiltrados.map((contrato) => {
            const operador = operadores.find((o) => o.id === contrato.operadorId);
            const estado = getEstadoContrato(contrato);
            const EstadoIcon = estado.icon;

            return (
              <Card key={contrato.id} className="hover:border-slate-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-slate-700/50">
                        <FileText className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100">{contrato.codigo}</h3>
                          <Badge
                            variant={
                              estado.color === 'green'
                                ? 'success'
                                : estado.color === 'yellow'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            <EstadoIcon className="h-3 w-3 mr-1" />
                            {estado.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {operador?.nombre || 'Operador desconocido'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(contrato.fechaInicio.toDate(), 'dd/MM/yyyy', { locale: es })}
                            {contrato.fechaFin && (
                              <> - {format(contrato.fechaFin.toDate(), 'dd/MM/yyyy', { locale: es })}</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Tipo</p>
                        <p className="font-medium text-slate-200">
                          {getTipoContratoLabel(contrato.tipo)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">SLA Crítico</p>
                        <p className="font-medium text-slate-200">
                          {contrato.slas.criticaHoras}h
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {contrato.documentoUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(contrato.documentoUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`/contratos/${contrato.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/contratos/${contrato.id}/editar`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setContratoAEliminar(contrato)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal confirmar eliminación */}
      <ConfirmDialog
        isOpen={!!contratoAEliminar}
        onClose={() => setContratoAEliminar(null)}
        onConfirm={handleEliminar}
        title="Eliminar Contrato"
        message={`¿Estás seguro de que deseas eliminar el contrato "${contratoAEliminar?.codigo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
